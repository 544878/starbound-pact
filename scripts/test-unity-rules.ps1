param([string]$EditorData='C:\Program Files\Unity\Hub\Editor\6000.3.23f1\Editor\Data')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$checkDir=Join-Path $projectRoot 'tmp\unity-check'
New-Item -ItemType Directory -Force $checkDir | Out-Null
$runtime=Get-ChildItem -LiteralPath (Join-Path $EditorData 'NetCoreRuntime\shared\Microsoft.NETCore.App') -Directory | Select-Object -First 1
$lines=@('-nologo','-target:exe','-langversion:9.0',('-out:"'+(Join-Path $checkDir 'RuleChecks.dll')+'"'))
$lines+=Get-ChildItem -LiteralPath $runtime.FullName -Filter '*.dll' | Where-Object {($_.Name -like 'System.*' -and $_.Name -notlike '*.Native.dll') -or $_.Name -in @('mscorlib.dll','netstandard.dll','Microsoft.CSharp.dll')} | ForEach-Object {'-r:"'+$_.FullName+'"'}
$lines+= '-r:"'+(Join-Path $EditorData 'Managed\Newtonsoft.Json.dll')+'"'
foreach($source in @('GameData.cs','AstralBattle.cs','Defense.cs','Activities.cs')){$lines+='"'+(Join-Path $projectRoot "unity\StarboundPact\Assets\Scripts\$source")+'"'}
$lines+='"'+(Join-Path $projectRoot 'unity\tests\RuleChecks.cs')+'"'
$rsp=Join-Path $checkDir 'tests.rsp'
[IO.File]::WriteAllLines($rsp,$lines)
& (Join-Path $EditorData 'NetCoreRuntime\dotnet.exe') (Join-Path $EditorData 'DotNetSdkRoslyn\csc.dll') "@$rsp"
if($LASTEXITCODE -ne 0){throw 'Rule test compilation failed'}
Copy-Item -LiteralPath (Join-Path $EditorData 'Managed\Newtonsoft.Json.dll') -Destination $checkDir -Force
@{runtimeOptions=@{tfm='net6.0';framework=@{name='Microsoft.NETCore.App';version=$runtime.Name}}}|ConvertTo-Json -Depth 4 | Set-Content (Join-Path $checkDir 'RuleChecks.runtimeconfig.json') -Encoding utf8
& (Join-Path $EditorData 'NetCoreRuntime\dotnet.exe') (Join-Path $checkDir 'RuleChecks.dll') $projectRoot
if($LASTEXITCODE -ne 0){throw 'Rule tests failed'}
