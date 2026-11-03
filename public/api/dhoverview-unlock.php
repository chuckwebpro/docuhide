<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/dhoverview.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dhoverviewSendJson(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

dhoverviewAssertFetch();

if (!is_readable(dhoverviewFragmentPath())) {
    error_log('Overview fragment missing.');
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'The overview is temporarily unavailable.']);
}

$body = dhoverviewReadJsonBody();
$access = dhoverviewNormalizeToken((string) ($body['access'] ?? ''));
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

try {
    $session = dhoverviewWithStore(function (array $data, int $now) use ($access, $ip): array {
        if (!dhoverviewAllowAttempt($data['attempts'], 'open|' . $ip, $now, 900, 10)) {
            return [$data, 'limited'];
        }
        if ($access === '') {
            return [$data, ''];
        }

        $hash = hash('sha256', $access);
        $row = $data['links'][$hash] ?? null;
        $valid = is_array($row)
            && (int) ($row['used'] ?? 0) === 0
            && (int) ($row['expires'] ?? 0) > $now;
        if (!$valid) {
            return [$data, ''];
        }

        $data['links'][$hash]['used'] = $now;
        $token = dhoverviewNewToken();
        $data['sessions'][hash('sha256', $token)] = [
            'expires' => $now + DHOVERVIEW_SESSION_TTL,
            'email' => (string) ($row['email'] ?? ''),
        ];

        return [$data, $token];
    });
} catch (Throwable $e) {
    error_log('Overview unlock failed: ' . $e->getMessage());
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'The overview is temporarily unavailable.']);
}

if ($session === 'limited') {
    dhoverviewSendJson(429, ['ok' => false, 'error' => 'Too many attempts. Please wait and try again.']);
}
if (!is_string($session) || !preg_match('/^[a-f0-9]{64}$/', $session)) {
    dhoverviewSendJson(400, ['ok' => false, 'error' => 'This link is invalid or has already been used.']);
}

try {
    $html = dhoverviewDocument();
} catch (Throwable $e) {
    error_log('Overview document failed: ' . $e->getMessage());
    $sessionHash = hash('sha256', $session);
    $linkHash = hash('sha256', $access);
    try {
        dhoverviewWithStore(function (array $data, int $now) use ($sessionHash, $linkHash): array {
            unset($data['sessions'][$sessionHash]);
            if (isset($data['links'][$linkHash]) && is_array($data['links'][$linkHash])) {
                $data['links'][$linkHash]['used'] = 0;
            }

            return [$data, null];
        });
    } catch (Throwable $cleanup) {
        error_log('Overview unlock rollback failed: ' . $cleanup->getMessage());
    }
    dhoverviewSendJson(503, ['ok' => false, 'error' => 'The overview is temporarily unavailable.']);
}

dhoverviewSetSessionCookie($session);
dhoverviewSendJson(200, ['ok' => true, 'html' => $html]);
