const fs = require('fs');
const axios = require('axios');
const os = require('os');
const dns = require('dns');
const { spawn } = require('child_process');

const LOG_FILE = '/var/log/auth.log'; // SSHのログファイル
const WEBHOOK_URL = 'DISCORD WEBHOOK'; // Discord Webhook URL
const HOSTNAME = os.hostname(); // サーバーのホスト名
const SUCCESS_COLOR = 0x00ff00; // 成功時の埋め込みメッセージの色（緑）
const FAILURE_COLOR = 0xff0000; // 失敗時の埋め込みメッセージの色（赤）
const DISCONNECTED_COLOR = 0xffff00; // 切断時の埋め込みメッセージの色（黄）
const FOOTER_TEXT = '© KuronekoServer. All rights reserved.'; // フッターのテキスト
const FOOTER_ICON_URL = 'https://cdn.krnk.org/kuronekoserver/logo.webp'; // フッターの画像URL

const parseLogLine = (line) => {
  const successRegex = /Accepted\s+(password|publickey)\s+for\s+(\w+)\s+from\s+([\d.]+)\s+port\s+\d+\s+ssh2/;
  const failRegex = /Failed\s+(password|publickey)\s+for\s+(?:invalid\s+user\s+)?(\w+)\s+from\s+([\d.]+)\s+port\s+\d+\s+ssh2/;
  const disconnectRegex = /Disconnected from (invalid user\s+)?(\w+)\s+([\d.]+)\s+port\s+\d+/;
  const authenticatingUserDisconnectRegex = /Disconnected from authenticating user (\w+) ([\d.]+) port \d+ \[preauth\]/;

  const successMatch = successRegex.exec(line);
  const failMatch = failRegex.exec(line);
  const disconnectMatch = disconnectRegex.exec(line);
  const authenticatingUserDisconnectMatch = authenticatingUserDisconnectRegex.exec(line);

  if (successMatch) {
    const [, method, username, ip] = successMatch;
    return { status: 'Success', method, username, ip, time: new Date().toISOString() };
  } else if (failMatch) {
    const [, method, username, ip] = failMatch;
    return { status: 'Failure', method, username, ip, time: new Date().toISOString() };
  } else if (disconnectMatch) {
    const [, invalidUserPrefix, username, ip] = disconnectMatch;
    return { status: 'Disconnected', username: invalidUserPrefix ? `invalid user ${username}` : username, ip, time: new Date().toISOString() };
  } else if (authenticatingUserDisconnectMatch) {
    const [, username, ip] = authenticatingUserDisconnectMatch;
    return { status: 'Disconnected', username, ip, time: new Date().toISOString() };
  }

  return null;
};

const getReverseDNS = (ip) => {
  return new Promise((resolve, reject) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err || !hostnames.length) {
        resolve('N/A');
      } else {
        resolve(hostnames[0]);
      }
    });
  });
};

const getISP = async (ip) => {
  try {
    const response = await axios.get(`https://ipinfo.io/${ip}/json`);
    return response.data.org || 'N/A';
  } catch (error) {
    console.error('Error fetching ISP information:', error);
    return 'N/A';
  }
};

const sendDiscordNotification = async ({ status, method, username, ip, time }) => {
  let hostname = 'N/A';
  let isp = 'N/A';
  try {
    hostname = await getReverseDNS(ip);
    isp = await getISP(ip);
  } catch (error) {
    console.error('Error fetching additional information:', error);
  }

  const embed = {
    title: `SSH ${status}`,
    fields: [
      { name: 'Time', value: time, inline: true },
      { name: 'Username', value: username, inline: true },
      { name: 'Hostname', value: HOSTNAME, inline: true },
      { name: 'IP', value: ip, inline: true },
      { name: 'Hostname (Reverse DNS)', value: hostname, inline: true },
      { name: 'ISP', value: isp, inline: true },
    ],
    footer: {
      text: FOOTER_TEXT,
      icon_url: FOOTER_ICON_URL,
    },
  };

  if (status === 'Success' || status === 'Failure') {
    embed.fields.push({ name: 'Auth Method', value: method, inline: true });
    embed.color = status === 'Success' ? SUCCESS_COLOR : FAILURE_COLOR;
  } else if (status === 'Disconnected') {
    embed.color = DISCONNECTED_COLOR;
  }

  try {
    await axios.post(WEBHOOK_URL, { embeds: [embed] });
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const tailLogFile = () => {
  const tail = spawn('tail', ['-F', LOG_FILE]);

  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      const logEntry = parseLogLine(line);
      if (logEntry) {
        sendDiscordNotification(logEntry);
      }
    });
  });

  tail.stderr.on('data', (data) => {
    console.error(`tail stderr: ${data}`);
  });

  tail.on('close', (code) => {
    console.log(`tail process exited with code ${code}`);
  });
};

// ログファイルの監視を開始
tailLogFile();
