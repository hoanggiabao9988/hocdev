<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents("php://input"), true);

$title = trim($input["title"] ?? "");
$content = trim($input["content"] ?? "");
$slug = trim($input["slug"] ?? "");

if ($slug === "") {
    die(json_encode(["error" => "Missing slug"]));
}

$repoOwner = "hoanggiabao9988";
$repoName  = "hocdev";
$token     = getenv("GITHUB_TOKEN"); // <-- KHÔNG ĐƯỢC HARD-CODE

$path = "posts/$slug.md";

$markdown = "# $title\n\n$content";
$base64 = base64_encode($markdown);

// 1. Lấy SHA của file cũ (để update)
$ch = curl_init("https://api.github.com/repos/$repoOwner/$repoName/contents/$path");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer $token",
  "User-Agent: PHP-cURL"
]);
$info = curl_exec($ch);
curl_close($ch);

$infoJson = json_decode($info, true);
$sha = $infoJson["sha"] ?? null;

// 2. Gửi PUT tạo file
$data = json_encode([
  "message" => "Update post $slug",
  "content" => $base64,
  "sha"     => $sha
]);

$ch2 = curl_init("https://api.github.com/repos/$repoOwner/$repoName/contents/$path");
curl_setopt($ch2, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch2, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer $token",
  "User-Agent: PHP-cURL",
  "Content-Type: application/json"
]);

$result = curl_exec($ch2);
curl_close($ch2);

echo $result;
