# ssh-notice-discord
discordにsshのログイン情報を通知する物

## Node.js LTS Version Debian Install
```
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 機能
本プログラムは以下の情報をDiscordのwebhookを使用し送信します。
- Time (アクセス/切断時刻)
- Username (アクセスユーザー名)
- Hostname (サーバーホスト名)
- IP (アクセスを試行したIP)
- Hostname (アクセスを試行したIPのhostname)
- ISP (アクセスを試行したIPのISP情報)
- Auth Method (サーバーのアクセス認証方法)