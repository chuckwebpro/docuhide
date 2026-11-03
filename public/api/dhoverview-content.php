<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/dhoverview.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    dhoverviewSendJson(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

dhoverviewAssertFetch();

$cookie = (string) ($_COOKIE[DHOVERVIEW_COOKIE] ?? '');

try {
    $active = dhoverviewWithStore(function (array $data, int $now) use ($cookie): array {
        return [$data, dhoverviewSessionActive($data, $cookie, $now)];
    });
} catch (Throwable $e) {
    error_log('Overview session read failed: ' . $e->getMessage());
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'The overview is temporarily unavailable.']);
}

if ($active !== true) {
    dhoverviewSendJson(401, ['ok' => false]);
}

try {
    $html = dhoverviewDocument();
} catch (Throwable $e) {
    error_log('Overview document failed: ' . $e->getMessage());
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'The overview is temporarily unavailable.']);
}

http_response_code(200);
dhoverviewPrivateHeaders();
header('Content-Type: text/html; charset=utf-8');
header('Vary: Cookie');
echo $html;
