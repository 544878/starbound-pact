param([string]$EditorData='C:\Program Files\Unity\Hub\Editor\6000.3.23f1\Editor\Data')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$checkDir=Join-Path $projectRoot 'tmp\unity-check'
New-Item -ItemType Directory -Force $checkDir | Out-Null
$sourceDir=Join-Path $projectRoot 'unity\StarboundPact\Assets'
$refs=@(Get-ChildItem -LiteralPath (Join-Path $EditorData 'NetStandard\ref\2.1.0') -Filter '*.dll')
$refs+=Get-ChildItem -LiteralPath (Join-Path $EditorData 'Managed\UnityEngine') -Filter '*.dll'
foreach($name in @('Newtonsoft.Json.dll')){$refs+=Get-Item -LiteralPath (Join-Path $EditorData "Managed\$name")}
$lines=@('-nologo','-target:library','-langversion:9.0','-define:UNITY_EDITOR,UNITY_STANDALONE_WIN',('-out:"'+(Join-Path $checkDir 'StarboundCheck.dll')+'"'))
$lines+=$refs | ForEach-Object {'-r:"'+$_.FullName+'"'}
$lines+=Get-ChildItem -LiteralPath $sourceDir -Filter '*.cs' -Recurse | ForEach-Object {'"'+$_.FullName+'"'}
$responsePath=Join-Path $checkDir 'compile.rsp'
[IO.File]::WriteAllLines($responsePath,$lines)
& (Join-Path $EditorData 'NetCoreRuntime\dotnet.exe') (Join-Path $EditorData 'DotNetSdkRoslyn\csc.dll') "@$responsePath"
if($LASTEXITCODE -ne 0){throw 'C# compilation failed'}
Write-Output 'All Unity runtime and editor C# sources compiled against the installed editor assemblies.'
