#!/bin/bash

# 日本のIPレンジを取得して許可
wget http://nami.jp/ipv4bycc/cidr.txt.gz
zcat cidr.txt.gz | grep ^JP > jp_cidr.txt
cat jp_cidr.txt | awk {'print "ufw allow from "$2" to any"'} > set_allow_jp.sh
sudo bash set_allow_jp.sh

# CloudflareのIPv4アドレスを許可
curl https://www.cloudflare.com/ips-v4 -o cloudflare_ips_v4.txt
cat cloudflare_ips_v4.txt | awk {'print "ufw allow from "$1" to any"'} > set_allow_cloudflare_v4.sh
sudo bash set_allow_cloudflare_v4.sh

# CloudflareのIPv6アドレスを許可
curl https://www.cloudflare.com/ips-v6 -o cloudflare_ips_v6.txt
cat cloudflare_ips_v6.txt | awk {'print "ufw allow from "$1" to any"'} > set_allow_cloudflare_v6.sh
sudo bash set_allow_cloudflare_v6.sh

# その他のIPをブロック
sudo ufw default deny incoming
sudo ufw enable
