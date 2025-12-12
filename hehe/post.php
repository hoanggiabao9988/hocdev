<?php
header('Content-Type: application/json');

// Nhận JSON
$input = json_decode(file_get_contents('php://input'), true);

// Validate cơ bản
$title   = htmlspecialchars(trim($input['title'] ?? ''));
$content = htmlspecialchars(trim($input['content'] ?? ''));
$slug    = preg_replace('/[^a-z0-9\-]/', '', strtolower($input['slug'] ?? ''));
$repoOwner = $input['repoOwner'] ?? '';
$repoName  = $input['repoName'] ?? '';

// LẤY TOKEN TỪ ENV (AN TOÀN)
$token = getenv("GITHUB_TOKEN");
if (!$token) {
    echo json_encode(["error" => "Missing GitHub token"]);
    exit;
}

// Tạo path file
$path = "posts/$slug.md";

// Markdown
$md = "# $title\n\n$content";
$base64 = base64_encode($md);

// JSON gửi GitHub
$data = json_encode([
    "message" => "Add post $slug",
    "content" => $base64
]);

// API URL
$url = "https://api.github.com/repos/$repoOwner/$repoName/contents/$path";

// cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $token",
    "User-Agent: PHP-cURL",
    "Accept: application/vnd.github+json",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
curl_close($ch);

// Output
echo $result;
