# 登录获取 token
$loginBody = '{"username":"admin","password":"Admin@G2306"}'
$loginRes = Invoke-WebRequest -Uri 'https://g2306-cengfan-api.gavineg2021-643.workers.dev/api/auth/login' `
  -Method POST -Headers @{'Content-Type'='application/json'} -Body $loginBody -TimeoutSec 15
$token = (ConvertFrom-Json $loginRes.Content).token
Write-Host "Logged in, token: $($token.Substring(0,20))..."

$headers = @{
  'Content-Type'  = 'application/json'
  'Authorization' = "Bearer $token"
}

$words = @(
  # 中文骂人
  '傻逼','草泥马','操你妈','妈的','操','艹','滚','贱人','废物','垃圾','混蛋',
  '王八蛋','狗日的','狗屁','白痴','蠢货','煞笔','傻叉','傻屄','脑残','智障',
  '死妈','你妈死了','弱智','神经病','畜生','滚蛋','臭逼','臭婊子','婊子','骚货',
  '狗娘养','fuck you','煞笔','傻瓜蛋','屌','屄','吊','逼','批','妈逼',
  '妈了个逼','日你妈','干你妈','操你','去死','脑子有病','有病','无脑','蠢猪',
  # 英文骂人
  'fuck','shit','bitch','asshole','bastard','damn','cunt','dick','pussy',
  'motherfucker','nigger','faggot','retard','idiot','moron','stupid','loser',
  'whore','slut','cock','prick','jerk','douchebag','scumbag','trash',
  'son of a bitch','go to hell','shut up','kill yourself',
  # 政治敏感
  '习近平','毛泽东','天安门','六四','法轮功','台独','藏独','新疆','维权',
  # 暴力/不雅
  '自杀','去死','杀了你','弄死你','打死你'
)

$success = 0
$fail = 0
foreach ($w in $words) {
  $body = "{`"word`":`"$w`"}"
  try {
    Invoke-WebRequest -Uri 'https://g2306-cengfan-api.gavineg2021-643.workers.dev/api/admin/banned-words' `
      -Method POST -Headers $headers -Body $body -TimeoutSec 10 | Out-Null
    Write-Host "  [OK] $w"
    $success++
  } catch {
    Write-Host "  [FAIL] $w"
    $fail++
  }
}

Write-Host "`nDone: $success added, $fail failed"
