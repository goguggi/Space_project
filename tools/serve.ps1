# 로컬 확인용 정적 파일 서버 (Windows PowerShell 5.1 이상)
# ES 모듈은 file:// 로 열면 동작하지 않으므로, 이 스크립트로 http://localhost:8000 에서 연다.
# 사용법 (저장소 최상위에서):
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8080
# 종료: Ctrl+C

param(
    [int]$Port = 8000
)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# 확장자별 MIME 형식. ES 모듈은 반드시 text/javascript 여야 한다.
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "로컬 서버 시작: http://localhost:$Port/  (루트: $root)  종료: Ctrl+C"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # 요청 하나의 오류가 서버 전체를 멈추지 않도록 요청별로 감싼다
        try {
            $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
            if ($relative -eq '') { $relative = 'index.html' }
            $path = Join-Path $root $relative
            $isHead = ($request.HttpMethod -eq 'HEAD')   # HEAD 요청은 본문을 보내지 않는다

            if ((Test-Path $path) -and -not (Get-Item $path).PSIsContainer) {
                $ext = [IO.Path]::GetExtension($path).ToLower()
                $type = $mime[$ext]
                if (-not $type) { $type = 'application/octet-stream' }
                $bytes = [IO.File]::ReadAllBytes($path)
                $response.StatusCode = 200
                $response.ContentType = $type
                $response.Headers.Add('Cache-Control', 'no-store')
                $response.ContentLength64 = $bytes.Length
                if (-not $isHead) { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
                Write-Host "200 $($request.HttpMethod) $relative"
            } else {
                $bytes = [Text.Encoding]::UTF8.GetBytes("찾을 수 없음: $relative")
                $response.StatusCode = 404
                $response.ContentType = 'text/plain; charset=utf-8'
                $response.ContentLength64 = $bytes.Length
                if (-not $isHead) { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
                Write-Host "404 $($request.HttpMethod) $relative"
            }
        } catch {
            Write-Host "오류: $($_.Exception.Message)"
        } finally {
            try { $response.OutputStream.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
