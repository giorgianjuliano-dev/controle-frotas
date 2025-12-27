$body = @{
    licensePlate = "TEST-8888"
    latitude = -23.550520
    longitude = -46.633308
    speed = 60
    heading = 90
    ignition = "on"
    batteryLevel = 88
    timestamp = "2025-12-27T12:00:00Z"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/tracking" -Method Post -Headers @{"x-api-key"="API-T3ST"; "Content-Type"="application/json"} -Body $body
    Write-Host "Success!"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:"
    $_.Exception.Response
}
