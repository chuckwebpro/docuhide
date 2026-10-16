<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/lib/mailer.php';

function jsonReply(int $status, string $message = ''): never
{
    http_response_code($status === 200 ? 200 : 400);
    echo json_encode(
        $status === 200 ? ['status' => 200] : ['status' => $status, 'message' => $message],
        JSON_UNESCAPED_UNICODE,
    );
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonReply(405, 'Method not allowed.');
}

$config = loadMailConfig();
if ($config === [] || empty($config['recaptcha_secret']) || empty($config['from_email'])) {
    error_log('Schedule demo mail config missing.');
    jsonReply(503, 'Form is temporarily unavailable.');
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    jsonReply(400, 'Invalid request.');
}

$recaptchaToken = (string) ($data['recaptchaToken'] ?? '');
$remoteIp = getClientIp();
if (!verifyRecaptcha($recaptchaToken, $config['recaptcha_secret'], 0.0, $remoteIp)) {
    jsonReply(400, 'Verification failed. Please complete the captcha and try again.');
}

$fields = [];
foreach ($data as $key => $entry) {
    if ($key === 'recaptchaToken' || !is_array($entry)) {
        continue;
    }
    $label = (string) ($entry['label'] ?? $key);
    $value = trim((string) ($entry['value'] ?? ''));
    $fields[$label] = $value;
}

$fromName = (string) ($config['from_name'] ?? 'Docuhide');
$subject = 'Requesting A Demo';
$bodyLines = ['Schedule demo request from docuhide.com', ''];
foreach ($fields as $label => $value) {
    $bodyLines[] = $label . ': ' . $value;
}
$htmlBody = '<pre>' . escapeHtml(implode("\n", $bodyLines)) . '</pre>';

try {
    sendMail(
        $config,
        $config['notify_to'],
        $fromName,
        $subject,
        $htmlBody,
        $fields['Email'] ?? null,
        trim(($fields['First Name'] ?? '') . ' ' . ($fields['Last Name'] ?? '')),
    );
} catch (Throwable $e) {
    error_log('Schedule demo send failed: ' . $e->getMessage());
    jsonReply(500, 'Could not send your request. Please try again later.');
}

jsonReply(200);
