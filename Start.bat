@echo off
title PharmaLink Service Manager
color 0A

REM PharmaLink Service Manager - Batch-Embedded PowerShell GUI
REM Creates temporary PowerShell script for GUI and runs it

echo.
echo  Loading PharmaLink Service Manager...
echo.

REM Get working directory
set "WORK_DIR=%~dp0"

REM Create temporary PowerShell script for GUI
(
echo Add-Type -AssemblyName System.Windows.Forms
echo Add-Type -AssemblyName System.Drawing
echo.
echo $script:workingDir = '%WORK_DIR%'
echo $script:processes = @{ Backend = $null; Frontend = $null; MLService = $null }
echo $script:isRunning = @{ Backend = $false; Frontend = $false; MLService = $false }
echo $script:statusLabels = @{}
echo $script:statusBoxes = @{}
echo $script:toggleButtons = @{}
echo.
echo # Colors
echo $primaryColor = [Drawing.Color]::FromArgb^(41, 128, 185^)
echo $successColor = [Drawing.Color]::FromArgb^(39, 174, 96^)
echo $dangerColor = [Drawing.Color]::FromArgb^(231, 76, 60^)
echo $warningColor = [Drawing.Color]::FromArgb^(241, 196, 15^)
echo $bgColor = [Drawing.Color]::FromArgb^(240, 242, 245^)
echo $cardColor = [Drawing.Color]::White
echo $textColor = [Drawing.Color]::FromArgb^(52, 73, 94^)
echo $mutedColor = [Drawing.Color]::FromArgb^(149, 165, 166^)
echo.
echo # Main Form
echo $form = New-Object Windows.Forms.Form
echo $form.Text = 'PharmaLink Service Manager v1.0'
echo $form.Size = New-Object Drawing.Size^(600, 600^)
echo $form.StartPosition = 'CenterScreen'
echo $form.FormBorderStyle = 'FixedSingle'
echo $form.MaximizeBox = $false
echo $form.BackColor = $bgColor
echo $form.Font = New-Object Drawing.Font^('Segoe UI', 9^)
echo.
echo # Header Panel
echo $headerPanel = New-Object Windows.Forms.Panel
echo $headerPanel.Size = New-Object Drawing.Size^(600, 100^)
echo $headerPanel.Location = New-Object Drawing.Point^(0, 0^)
echo $headerPanel.BackColor = $primaryColor
echo $form.Controls.Add^($headerPanel^)
echo.
echo # Title
echo $title = New-Object Windows.Forms.Label
echo $title.Text = 'PHARMALINK'
echo $title.Font = New-Object Drawing.Font^('Segoe UI', 26, [Drawing.FontStyle]::Bold^)
echo $title.ForeColor = [Drawing.Color]::White
echo $title.AutoSize = $true
echo $title.Location = New-Object Drawing.Point^(30, 25^)
echo $headerPanel.Controls.Add^($title^)
echo.
echo # Subtitle
echo $subtitle = New-Object Windows.Forms.Label
echo $subtitle.Text = 'Integrated Service Management Console'
echo $subtitle.Font = New-Object Drawing.Font^('Segoe UI', 10^)
echo $subtitle.ForeColor = [Drawing.Color]::FromArgb^(220, 220, 220^)
echo $subtitle.AutoSize = $true
echo $subtitle.Location = New-Object Drawing.Point^(33, 75^)
echo $headerPanel.Controls.Add^($subtitle^)
echo.
echo # Status Bar
echo $statusBar = New-Object Windows.Forms.Panel
echo $statusBar.Size = New-Object Drawing.Size^(600, 30^)
echo $statusBar.Location = New-Object Drawing.Point^(0, 535^)
echo $statusBar.BackColor = [Drawing.Color]::FromArgb^(52, 73, 94^)
echo $form.Controls.Add^($statusBar^)
echo.
echo $script:statusLabel = New-Object Windows.Forms.Label
echo $script:statusLabel.Text = 'Ready'
echo $script:statusLabel.Font = New-Object Drawing.Font^('Segoe UI', 9^)
echo $script:statusLabel.ForeColor = [Drawing.Color]::White
echo $script:statusLabel.AutoSize = $true
echo $script:statusLabel.Location = New-Object Drawing.Point^(15, 7^)
echo $statusBar.Controls.Add^($script:statusLabel^)
echo.
echo function Update-Status { param^($msg^); $script:statusLabel.Text = $msg; $form.Refresh^(^) }
echo.
echo function Create-ServiceCard {
echo     param^($cardTitle, $description, $port, $y, $tag^)
echo     $card = New-Object Windows.Forms.Panel
echo     $card.Size = New-Object Drawing.Size^(540, 100^)
echo     $card.Location = New-Object Drawing.Point^(30, $y^)
echo     $card.BackColor = $cardColor
echo     $card.BorderStyle = 'FixedSingle'
echo.
echo     $statusBox = New-Object Windows.Forms.Panel
echo     $statusBox.Size = New-Object Drawing.Size^(10, 100^)
echo     $statusBox.Location = New-Object Drawing.Point^(0, 0^)
echo     $statusBox.BackColor = $mutedColor
echo     $card.Controls.Add^($statusBox^)
echo     $script:statusBoxes[$tag] = $statusBox
echo.
echo     $icon = New-Object Windows.Forms.Label
echo     $icon.Text = '[S]'
echo     $icon.Font = New-Object Drawing.Font^('Consolas', 16, [Drawing.FontStyle]::Bold^)
echo     $icon.ForeColor = $primaryColor
echo     $icon.AutoSize = $true
echo     $icon.Location = New-Object Drawing.Point^(25, 15^)
echo     $card.Controls.Add^($icon^)
echo.
echo     $titleLbl = New-Object Windows.Forms.Label
echo     $titleLbl.Text = $cardTitle
echo     $titleLbl.Font = New-Object Drawing.Font^('Segoe UI', 12, [Drawing.FontStyle]::Bold^)
echo     $titleLbl.ForeColor = $textColor
echo     $titleLbl.AutoSize = $true
echo     $titleLbl.Location = New-Object Drawing.Point^(70, 15^)
echo     $card.Controls.Add^($titleLbl^)
echo.
echo     $descLbl = New-Object Windows.Forms.Label
echo     $descLbl.Text = $description
echo     $descLbl.Font = New-Object Drawing.Font^('Segoe UI', 9^)
echo     $descLbl.ForeColor = $mutedColor
echo     $descLbl.AutoSize = $true
echo     $descLbl.Location = New-Object Drawing.Point^(70, 40^)
echo     $card.Controls.Add^($descLbl^)
echo.
echo     $portLbl = New-Object Windows.Forms.Label
echo     $portLbl.Text = "PORT: $port"
echo     $portLbl.Font = New-Object Drawing.Font^('Consolas', 9, [Drawing.FontStyle]::Bold^)
echo     $portLbl.ForeColor = $primaryColor
echo     $portLbl.AutoSize = $true
echo     $portLbl.Location = New-Object Drawing.Point^(70, 65^)
echo     $card.Controls.Add^($portLbl^)
echo.
echo     $statusText = New-Object Windows.Forms.Label
echo     $statusText.Text = 'STOPPED'
echo     $statusText.Font = New-Object Drawing.Font^('Segoe UI', 9, [Drawing.FontStyle]::Bold^)
echo     $statusText.ForeColor = $mutedColor
echo     $statusText.AutoSize = $true
echo     $statusText.Location = New-Object Drawing.Point^(350, 20^)
echo     $card.Controls.Add^($statusText^)
echo     $script:statusLabels[$tag] = $statusText
echo.
echo     $btn = New-Object Windows.Forms.Button
echo     $btn.Text = 'START'
echo     $btn.Size = New-Object Drawing.Size^(100, 35^)
echo     $btn.Location = New-Object Drawing.Point^(420, 15^)
echo     $btn.FlatStyle = 'Flat'
echo     $btn.BackColor = $successColor
echo     $btn.ForeColor = [Drawing.Color]::White
echo     $btn.Font = New-Object Drawing.Font^('Segoe UI', 10, [Drawing.FontStyle]::Bold^)
echo     $btn.Cursor = 'Hand'
echo     $btn.Tag = $tag
echo     $btn.FlatAppearance.BorderSize = 0
echo     $script:toggleButtons[$tag] = $btn
echo     $btn.Add_Click^({ Toggle-Service -serviceName $this.Tag -button $this }^)
echo     $card.Controls.Add^($btn^)
echo.
echo     $installBtn = New-Object Windows.Forms.Button
echo     $installBtn.Text = 'INSTALL ^& START'
echo     $installBtn.Size = New-Object Drawing.Size^(140, 35^)
echo     $installBtn.Location = New-Object Drawing.Point^(380, 55^)
echo     $installBtn.FlatStyle = 'Flat'
echo     $installBtn.BackColor = [Drawing.Color]::FromArgb^(0, 122, 204^)
echo     $installBtn.ForeColor = [Drawing.Color]::White
echo     $installBtn.Font = New-Object Drawing.Font^('Segoe UI', 9^)
echo     $installBtn.Cursor = 'Hand'
echo     $installBtn.Tag = $tag
echo     $installBtn.FlatAppearance.BorderSize = 0
echo     $installBtn.Add_Click^({ Install-Service -serviceName $this.Tag }^)
echo     $card.Controls.Add^($installBtn^)
echo.
echo     return $card
echo }
echo.
echo function Toggle-Service {
echo     param^($serviceName, $button^)
echo     if ^($script:isRunning[$serviceName]^) {
echo         Update-Status "Stopping $serviceName..."
echo         if ^($script:processes[$serviceName] -ne $null^) {
echo             try { Stop-Process -Id $script:processes[$serviceName].Id -Force -EA SilentlyContinue } catch {}
echo         }
echo         $script:isRunning[$serviceName] = $false
echo         $button.Text = 'START'
echo         $button.BackColor = $successColor
echo         $script:statusLabels[$serviceName].Text = 'STOPPED'
echo         $script:statusLabels[$serviceName].ForeColor = $mutedColor
echo         $script:statusBoxes[$serviceName].BackColor = $mutedColor
echo         Update-Status "$serviceName stopped"
echo     } else {
echo         Update-Status "Starting $serviceName..."
echo         $svcDir = switch ^($serviceName^) {
echo             'Backend' { Join-Path $script:workingDir 'backend' }
echo             'Frontend' { Join-Path $script:workingDir 'frontend' }
echo             'MLService' { Join-Path $script:workingDir 'ml_service' }
echo         }
echo         $runCmd = switch ^($serviceName^) {
echo             'Backend' { 'npm run dev' }
echo             'Frontend' { 'npm run dev' }
echo             'MLService' { 'uvicorn main:app --host 0.0.0.0 --port 8000 --reload' }
echo         }
echo         $winTitle = switch ^($serviceName^) {
echo             'Backend' { 'PharmaLink Backend ^(Port 3000^)' }
echo             'Frontend' { 'PharmaLink Frontend ^(Port 5173^)' }
echo             'MLService' { 'PharmaLink ML Service ^(Port 8000^)' }
echo         }
echo         $script:processes[$serviceName] = Start-Process -FilePath 'cmd.exe' -ArgumentList "/k title $winTitle ^& cd /d `"$svcDir`" ^& $runCmd" -PassThru
echo         $script:isRunning[$serviceName] = $true
echo         $button.Text = 'STOP'
echo         $button.BackColor = $dangerColor
echo         $script:statusLabels[$serviceName].Text = 'RUNNING'
echo         $script:statusLabels[$serviceName].ForeColor = $successColor
echo         $script:statusBoxes[$serviceName].BackColor = $successColor
echo         Update-Status "$serviceName started successfully"
echo     }
echo     Update-AllBtn
echo }
echo.
echo function Install-Service {
echo     param^($serviceName^)
echo     Update-Status "Installing dependencies for $serviceName..."
echo     $svcDir = switch ^($serviceName^) {
echo         'Backend' { Join-Path $script:workingDir 'backend' }
echo         'Frontend' { Join-Path $script:workingDir 'frontend' }
echo         'MLService' { Join-Path $script:workingDir 'ml_service' }
echo     }
echo     $installCmd = switch ^($serviceName^) {
echo         'Backend' { 'echo. ^| npm install ^& npm run dev' }
echo         'Frontend' { 'echo. ^| npm install ^& npm run dev' }
echo         'MLService' { 'pip install -r requirements.txt ^& uvicorn main:app --host 0.0.0.0 --port 8000 --reload' }
echo     }
echo     $winTitle = "$serviceName - Installing Dependencies"
echo     Start-Process -FilePath 'cmd.exe' -ArgumentList "/k title $winTitle ^& cd /d `"$svcDir`" ^& $installCmd"
echo     Update-Status "$serviceName installation started in new window"
echo }
echo.
echo function Update-AllBtn {
echo     $allRunning = $script:isRunning['Backend'] -and $script:isRunning['Frontend'] -and $script:isRunning['MLService']
echo     if ^($allRunning^) {
echo         $script:btnAll.Text = 'STOP ALL SERVICES'
echo         $script:btnAll.BackColor = $dangerColor
echo     } else {
echo         $script:btnAll.Text = 'START ALL SERVICES'
echo         $script:btnAll.BackColor = $primaryColor
echo     }
echo }
echo.
echo function Check-ProcessStatus {
echo     foreach ^($svc in @^('Backend', 'Frontend', 'MLService'^)^) {
echo         if ^($script:isRunning[$svc]^) {
echo             $proc = $script:processes[$svc]
echo             if ^($proc -ne $null^) {
echo                 try {
echo                     if ^($proc.HasExited^) {
echo                         $script:isRunning[$svc] = $false
echo                         $script:processes[$svc] = $null
echo                         $btn = $script:toggleButtons[$svc]
echo                         if ^($btn -ne $null^) { $btn.Text = 'START'; $btn.BackColor = $successColor }
echo                         if ^($script:statusLabels[$svc] -ne $null^) { $script:statusLabels[$svc].Text = 'STOPPED'; $script:statusLabels[$svc].ForeColor = $mutedColor }
echo                         if ^($script:statusBoxes[$svc] -ne $null^) { $script:statusBoxes[$svc].BackColor = $mutedColor }
echo                         Update-Status "$svc was closed externally"
echo                         Update-AllBtn
echo                     }
echo                 } catch { $script:isRunning[$svc] = $false; $script:processes[$svc] = $null }
echo             }
echo         }
echo     }
echo }
echo.
echo # Add Service Cards
echo $yPos = 120
echo $form.Controls.Add^(^(Create-ServiceCard 'Backend API' 'Express.js REST API with MongoDB' '3000' $yPos 'Backend'^)^)
echo $yPos += 110
echo $form.Controls.Add^(^(Create-ServiceCard 'Frontend Application' 'Vite + React User Interface' '5173' $yPos 'Frontend'^)^)
echo $yPos += 110
echo $form.Controls.Add^(^(Create-ServiceCard 'ML Service' 'FastAPI Machine Learning Service' '8000' $yPos 'MLService'^)^)
echo.
echo # Control Panel
echo $controlPanel = New-Object Windows.Forms.Panel
echo $controlPanel.Size = New-Object Drawing.Size^(540, 60^)
echo $controlPanel.Location = New-Object Drawing.Point^(30, 460^)
echo $controlPanel.BackColor = [Drawing.Color]::FromArgb^(250, 250, 250^)
echo $controlPanel.BorderStyle = 'FixedSingle'
echo $form.Controls.Add^($controlPanel^)
echo.
echo # Start All Button
echo $script:btnAll = New-Object Windows.Forms.Button
echo $script:btnAll.Text = 'START ALL SERVICES'
echo $script:btnAll.Size = New-Object Drawing.Size^(160, 40^)
echo $script:btnAll.Location = New-Object Drawing.Point^(20, 10^)
echo $script:btnAll.FlatStyle = 'Flat'
echo $script:btnAll.BackColor = $primaryColor
echo $script:btnAll.ForeColor = [Drawing.Color]::White
echo $script:btnAll.Font = New-Object Drawing.Font^('Segoe UI', 10, [Drawing.FontStyle]::Bold^)
echo $script:btnAll.Cursor = 'Hand'
echo $script:btnAll.FlatAppearance.BorderSize = 0
echo $script:btnAll.Add_Click^({
echo     $allRunning = $script:isRunning['Backend'] -and $script:isRunning['Frontend'] -and $script:isRunning['MLService']
echo     if ^($allRunning^) {
echo         Update-Status 'Stopping all services...'
echo         foreach ^($svc in @^('MLService', 'Frontend', 'Backend'^)^) {
echo             if ^($script:isRunning[$svc]^) { Toggle-Service -serviceName $svc -button $script:toggleButtons[$svc]; Start-Sleep -Milliseconds 500 }
echo         }
echo         Update-Status 'All services stopped'
echo     } else {
echo         Update-Status 'Starting all services...'
echo         foreach ^($svc in @^('MLService', 'Backend', 'Frontend'^)^) {
echo             if ^(-not $script:isRunning[$svc]^) { Toggle-Service -serviceName $svc -button $script:toggleButtons[$svc]; Start-Sleep -Seconds 2 }
echo         }
echo         Update-Status 'All services started successfully'
echo     }
echo }^)
echo $controlPanel.Controls.Add^($script:btnAll^)
echo.
echo # Install All Button
echo $script:btnAllInstall = New-Object Windows.Forms.Button
echo $script:btnAllInstall.Text = 'INSTALL ^& RUN ALL'
echo $script:btnAllInstall.Size = New-Object Drawing.Size^(160, 40^)
echo $script:btnAllInstall.Location = New-Object Drawing.Point^(200, 10^)
echo $script:btnAllInstall.FlatStyle = 'Flat'
echo $script:btnAllInstall.BackColor = $warningColor
echo $script:btnAllInstall.ForeColor = [Drawing.Color]::White
echo $script:btnAllInstall.Font = New-Object Drawing.Font^('Segoe UI', 10, [Drawing.FontStyle]::Bold^)
echo $script:btnAllInstall.Cursor = 'Hand'
echo $script:btnAllInstall.FlatAppearance.BorderSize = 0
echo $script:btnAllInstall.Add_Click^({
echo     Update-Status 'Installing dependencies for all services...'
echo     foreach ^($svc in @^('MLService', 'Backend', 'Frontend'^)^) {
echo         Install-Service -serviceName $svc
echo         Start-Sleep -Seconds 2
echo     }
echo     Update-Status 'All installation processes started in separate windows'
echo }^)
echo $controlPanel.Controls.Add^($script:btnAllInstall^)
echo.
echo # Exit Button
echo $exitBtn = New-Object Windows.Forms.Button
echo $exitBtn.Text = 'EXIT'
echo $exitBtn.Size = New-Object Drawing.Size^(100, 40^)
echo $exitBtn.Location = New-Object Drawing.Point^(420, 10^)
echo $exitBtn.FlatStyle = 'Flat'
echo $exitBtn.BackColor = [Drawing.Color]::FromArgb^(149, 165, 166^)
echo $exitBtn.ForeColor = [Drawing.Color]::White
echo $exitBtn.Font = New-Object Drawing.Font^('Segoe UI', 10^)
echo $exitBtn.Cursor = 'Hand'
echo $exitBtn.FlatAppearance.BorderSize = 0
echo $exitBtn.Add_Click^({ $form.Close^(^) }^)
echo $controlPanel.Controls.Add^($exitBtn^)
echo.
echo # Form Closing Handler
echo $form.Add_FormClosing^({
echo     $runningServices = @^(^)
echo     foreach ^($svc in @^('MLService', 'Frontend', 'Backend'^)^) {
echo         if ^($script:isRunning[$svc]^) { $runningServices += $svc }
echo     }
echo     if ^($runningServices.Count -gt 0^) {
echo         $result = [Windows.Forms.MessageBox]::Show^(
echo             "The following services are still running:`n`n$^($runningServices -join ', '^)`n`nDo you want to stop them before exiting?",
echo             'Running Services Detected',
echo             [Windows.Forms.MessageBoxButtons]::YesNoCancel,
echo             [Windows.Forms.MessageBoxIcon]::Warning
echo         ^)
echo         if ^($result -eq 'Cancel'^) { $_.Cancel = $true; return }
echo         if ^($result -eq 'Yes'^) {
echo             foreach ^($svc in @^('MLService', 'Frontend', 'Backend'^)^) {
echo                 if ^($script:processes[$svc] -ne $null^) {
echo                     try { Stop-Process -Id $script:processes[$svc].Id -Force -EA SilentlyContinue } catch {}
echo                 }
echo             }
echo         }
echo     }
echo }^)
echo.
echo # Process Monitor Timer
echo $script:processMonitor = New-Object Windows.Forms.Timer
echo $script:processMonitor.Interval = 1000
echo $script:processMonitor.Add_Tick^({ Check-ProcessStatus }^)
echo $script:processMonitor.Start^(^)
echo.
echo Update-Status 'PharmaLink Service Manager Ready'
echo [void]$form.ShowDialog^(^)
echo.
echo $script:processMonitor.Stop^(^)
echo $script:processMonitor.Dispose^(^)
) > "%temp%\pharmalink_gui.ps1"

REM Run the PowerShell GUI
powershell -ExecutionPolicy Bypass -NoProfile -File "%temp%\pharmalink_gui.ps1"

REM Cleanup
del "%temp%\pharmalink_gui.ps1" 2>nul
