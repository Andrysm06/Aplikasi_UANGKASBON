<?php
echo "<h1>Cek Kemampuan Server</h1>";
echo "<pre>";
echo "Node version: " . shell_exec('node -v') . "\n";
echo "NPM version: " . shell_exec('npm -v') . "\n";
echo "Path: " . shell_exec('which node') . "\n";
echo "</pre>";
?>
