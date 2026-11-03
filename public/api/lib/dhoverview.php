<?php

declare(strict_types=1);

const DHOVERVIEW_TOKEN_TTL = 72 * 3600;
const DHOVERVIEW_SESSION_TTL = 12 * 3600;
const DHOVERVIEW_COOKIE = 'dh_ov';

function dhoverviewStoreDir(): string
{
    $dir = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'dhoverview';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Access store unavailable.');
    }

    return $dir;
}

function dhoverviewFragmentPath(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'dhoverview-body.html';
}

function dhoverviewPrivateHeaders(): void
{
    header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
}

function dhoverviewSendJson(int $status, array $payload): never
{
    http_response_code($status);
    dhoverviewPrivateHeaders();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT,
    );
    exit;
}

function dhoverviewAssertFetch(): void
{
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'dhoverview') {
        dhoverviewSendJson(400, ['ok' => false, 'error' => 'Invalid request.']);
    }

    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return;
    }

    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $host = (string) preg_replace('/:\d+$/', '', $host);
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    if ($host === '' || $originHost === '' || $originHost !== $host) {
        dhoverviewSendJson(403, ['ok' => false, 'error' => 'Invalid request.']);
    }
}

function dhoverviewReadJsonBody(): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 20000) {
        dhoverviewSendJson(413, ['ok' => false, 'error' => 'Invalid request.']);
    }

    $raw = file_get_contents('php://input');
    if (!is_string($raw) || strlen($raw) > 20000) {
        dhoverviewSendJson(400, ['ok' => false, 'error' => 'Invalid request.']);
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        dhoverviewSendJson(400, ['ok' => false, 'error' => 'Invalid request.']);
    }

    return $data;
}

function dhoverviewClean(string $value, int $max): string
{
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }

    return substr($value, 0, $max);
}

function dhoverviewNewToken(): string
{
    return bin2hex(random_bytes(32));
}

function dhoverviewNormalizeToken(string $token): string
{
    $token = strtolower(trim($token));
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return '';
    }

    return $token;
}

function dhoverviewHttps(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function dhoverviewSetSessionCookie(string $token): void
{
    setcookie(DHOVERVIEW_COOKIE, $token, [
        'expires' => time() + DHOVERVIEW_SESSION_TTL,
        'path' => '/',
        'secure' => dhoverviewHttps(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * @param array<string, list<int>> $attempts
 */
function dhoverviewAllowAttempt(array &$attempts, string $bucket, int $now, int $window, int $max): bool
{
    $key = hash('sha256', $bucket);
    $hits = [];
    foreach ($attempts[$key] ?? [] as $ts) {
        $ts = (int) $ts;
        if (($now - $ts) < $window) {
            $hits[] = $ts;
        }
    }

    if (count($hits) >= $max) {
        $attempts[$key] = $hits;

        return false;
    }

    $hits[] = $now;
    $attempts[$key] = $hits;

    return true;
}

function dhoverviewWithStore(callable $mutator): mixed
{
    $path = dhoverviewStoreDir() . DIRECTORY_SEPARATOR . 'codes.json';
    $fh = fopen($path, 'c+');
    if ($fh === false) {
        throw new RuntimeException('Access store unavailable.');
    }

    try {
        if (!flock($fh, LOCK_EX)) {
            throw new RuntimeException('Access store unavailable.');
        }

        $raw = stream_get_contents($fh);
        $data = json_decode(is_string($raw) ? $raw : '', true);
        if (!is_array($data)) {
            $data = [];
        }

        foreach (['links', 'sessions', 'attempts'] as $key) {
            if (!isset($data[$key]) || !is_array($data[$key])) {
                $data[$key] = [];
            }
        }

        $now = time();
        foreach ($data['links'] as $key => $row) {
            if (!is_array($row) || (int) ($row['expires'] ?? 0) < $now) {
                unset($data['links'][$key]);
            }
        }
        foreach ($data['sessions'] as $key => $row) {
            if (!is_array($row) || (int) ($row['expires'] ?? 0) < $now) {
                unset($data['sessions'][$key]);
            }
        }

        [$data, $result] = $mutator($data, $now);
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE);
        if (!is_string($encoded)) {
            throw new RuntimeException('Access store unavailable.');
        }

        rewind($fh);
        ftruncate($fh, 0);
        rewind($fh);
        if (fwrite($fh, $encoded) === false) {
            throw new RuntimeException('Access store unavailable.');
        }
        fflush($fh);

        return $result;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function dhoverviewSessionActive(array $data, string $token, int $now): bool
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return false;
    }

    $row = $data['sessions'][hash('sha256', $token)] ?? null;

    return is_array($row) && (int) ($row['expires'] ?? 0) > $now;
}

function dhoverviewDocument(): string
{
    $path = dhoverviewFragmentPath();
    $fragment = is_readable($path) ? file_get_contents($path) : false;
    if (!is_string($fragment) || $fragment === '') {
        throw new RuntimeException('Overview unavailable.');
    }

    $marker = '</style>';
    $split = strpos($fragment, $marker);
    if ($split === false) {
        throw new RuntimeException('Overview unavailable.');
    }

    $split += strlen($marker);
    $head = substr($fragment, 0, $split);
    $body = substr($fragment, $split);

    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n"
        . "<meta charset=\"utf-8\">\n"
        . "<meta name=\"robots\" content=\"noindex, nofollow, noarchive, nosnippet\">\n"
        . "<meta name=\"googlebot\" content=\"noindex, nofollow\">\n"
        . "<meta name=\"referrer\" content=\"no-referrer\">\n"
        . $head
        . "\n</head>\n<body>\n"
        . $body
        . "\n</body>\n</html>\n";
}
