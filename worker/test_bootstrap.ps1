$body = '{"username":"admin","password":"Admin@G2306","display_name":"Admin"}'
$headers = @{'Content-Type'='application/json'}
$res = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/bootstrap' -Method POST -Body $body -Headers $headers -TimeoutSec 15
Write-Host $res.Content
