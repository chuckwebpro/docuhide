<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/dhoverview.php';
require_once __DIR__ . '/lib/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dhoverviewSendJson(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

dhoverviewAssertFetch();

$config = loadMailConfig();
$notify = parseEmailList($config['notify_to'] ?? '');
if (
    $config === []
    || empty($config['recaptcha_secret'])
    || empty($config['from_email'])
    || $notify === []
) {
    error_log('Overview mail config missing or incomplete.');
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'This form is temporarily unavailable.']);
}

$body = dhoverviewReadJsonBody();
if (trim((string) ($body['_gotcha'] ?? '')) !== '') {
    dhoverviewSendJson(200, ['ok' => true]);
}

$remoteIp = getClientIp();
$recaptcha = trim((string) ($body['recaptcha'] ?? ''));
$minScore = (float) ($config['recaptcha_min_score'] ?? 0.5);
if (!verifyRecaptcha($recaptcha, (string) $config['recaptcha_secret'], $minScore, $remoteIp)) {
    dhoverviewSendJson(400, [
        'ok' => false,
        'error' => 'Verification failed. Please complete the security check and try again.',
    ]);
}

$first = dhoverviewClean((string) ($body['first_name'] ?? ''), 80);
$last = dhoverviewClean((string) ($body['last_name'] ?? ''), 80);
$company = dhoverviewClean((string) ($body['company'] ?? ''), 120);
$phone = dhoverviewClean((string) ($body['phone'] ?? ''), 40);
$email = strtolower(dhoverviewClean((string) ($body['email'] ?? ''), 254));

if ($first === '' || $last === '') {
    dhoverviewSendJson(400, ['ok' => false, 'error' => 'Please enter your first and last name.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    dhoverviewSendJson(400, ['ok' => false, 'error' => 'Please enter a valid email address.']);
}

$digits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($digits) < 7 || strlen($digits) > 15) {
    dhoverviewSendJson(400, ['ok' => false, 'error' => 'Please enter a valid phone number.']);
}

$connectionIp = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if (!filter_var($connectionIp, FILTER_VALIDATE_IP)) {
    $connectionIp = '';
}
$ipLine = $remoteIp;
if ($connectionIp !== '' && $connectionIp !== $remoteIp) {
    $ipLine .= ' (connection ' . $connectionIp . ')';
}

try {
    $issued = dhoverviewWithStore(function (array $data, int $now) use ($email, $remoteIp): array {
        if (!dhoverviewAllowAttempt($data['attempts'], 'req|' . $remoteIp, $now, 3600, 5)) {
            return [$data, 'limited'];
        }
        if (!dhoverviewAllowAttempt($data['attempts'], 'email|' . $email, $now, 86400, 5)) {
            return [$data, 'limited'];
        }

        foreach ($data['links'] as $key => $row) {
            if (
                is_array($row)
                && strcasecmp((string) ($row['email'] ?? ''), $email) === 0
                && empty($row['used'])
            ) {
                unset($data['links'][$key]);
            }
        }

        $token = dhoverviewNewToken();
        $data['links'][hash('sha256', $token)] = [
            'email' => $email,
            'expires' => $now + DHOVERVIEW_TOKEN_TTL,
            'used' => 0,
        ];

        return [$data, $token];
    });
} catch (Throwable $e) {
    error_log('Overview store failed: ' . $e->getMessage());
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'This form is temporarily unavailable.']);
}

if ($issued === 'limited') {
    dhoverviewSendJson(429, ['ok' => false, 'error' => 'Too many requests. Please try again later.']);
}
if (!is_string($issued) || !preg_match('/^[a-f0-9]{64}$/', $issued)) {
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'This form is temporarily unavailable.']);
}

$accessToken = $issued;
$hash = hash('sha256', $accessToken);
$fromName = (string) ($config['from_name'] ?? 'Docuhide');
$siteUrl = rtrim((string) ($config['site_url'] ?? 'https://www.docuhide.com'), '/');
$pageUrl = $siteUrl . '/dhoverview/?access=' . $accessToken;
$tzName = (string) ($config['timezone'] ?? 'America/New_York');
try {
    $tz = new DateTimeZone($tzName);
} catch (Throwable) {
    $tz = new DateTimeZone('America/New_York');
}
$nowDt = new DateTimeImmutable('now', $tz);
$submittedAt = $nowDt->format('M j, Y g:i A T');
$expiresAt = $nowDt->modify('+72 hours')->format('M j, Y g:i A T');

$vars = [
    'first' => escapeHtml($first),
    'last' => escapeHtml($last),
    'name' => escapeHtml($first),
    'company' => escapeHtml($company !== '' ? $company : '—'),
    'phone' => escapeHtml($phone),
    'email' => escapeHtml($email),
    'email_raw' => $email,
    'ip' => escapeHtml($ipLine),
    'submitted_at' => escapeHtml($submittedAt),
    'expires' => escapeHtml($expiresAt),
    'page_url' => escapeHtml($pageUrl),
    'site_name' => escapeHtml($fromName),
    'site_url' => escapeHtml($siteUrl),
    'site_phone' => escapeHtml((string) ($config['site_phone'] ?? '')),
    'site_phone_href' => escapeHtml((string) ($config['site_phone_href'] ?? '')),
];

try {
    $teamHtml = renderTemplate('notification-dhoverview.html', $vars);
    $visitorHtml = renderTemplate('autoreply-dhoverview.html', $vars);
    sendMail(
        $config,
        $notify,
        $fromName,
        'Overview access — ' . $first . ' ' . $last,
        $teamHtml,
        $email,
        $first . ' ' . $last,
    );
    sendMail(
        $config,
        $email,
        $first . ' ' . $last,
        'Your Docuhide access link',
        $visitorHtml,
        $notify[0],
        $fromName,
    );
} catch (Throwable $e) {
    error_log('Overview mail failed: ' . $e->getMessage());
    try {
        dhoverviewWithStore(function (array $data, int $now) use ($hash): array {
            unset($data['links'][$hash]);

            return [$data, null];
        });
    } catch (Throwable $cleanup) {
        error_log('Overview cleanup failed: ' . $cleanup->getMessage());
    }
    dhoverviewSendJson(500, ['ok' => false, 'error' => 'Could not send your access link. Please try again.']);
}

dhoverviewSendJson(200, ['ok' => true]);
