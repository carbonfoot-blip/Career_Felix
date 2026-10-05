$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$workingDir = $PSScriptRoot

$jobs = @(
  @{ html = "cv_fr.html"; pdf = "Felix_Antoine_Legault_CV_FR.pdf" },
  @{ html = "cv_en.html"; pdf = "Felix_Antoine_Legault_CV_EN.pdf" },
  @{ html = "cv_servicenow_fr.html"; pdf = "Felix_Antoine_Legault_CV_ServiceNow_FR.pdf" },
  @{ html = "cv_servicenow_en.html"; pdf = "Felix_Antoine_Legault_CV_ServiceNow_EN.pdf" },
  @{ html = "lettre_motivation_servicenow_fr.html"; pdf = "Felix_Antoine_Legault_Lettre_ServiceNow_FR.pdf" },
  @{ html = "cover_letter_servicenow_en.html"; pdf = "Felix_Antoine_Legault_CoverLetter_ServiceNow_EN.pdf" }
)

foreach ($j in $jobs) {
  $in = Join-Path $workingDir $j.html
  $out = Join-Path $workingDir $j.pdf
  Write-Host "Exporting $in -> $out"
  Start-Process -FilePath $edgePath -ArgumentList "--headless=new", "--no-pdf-header-footer", "--print-to-pdf=$out", $in -Wait
}

Write-Host "All 6 PDFs successfully compiled!"
Get-ChildItem -Path $workingDir -Filter "*.pdf" | Select-Object Name, Length, LastWriteTime
