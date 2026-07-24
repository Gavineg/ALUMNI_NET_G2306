// vfs.js — Virtual Filesystem for G2306 Cyberpunk Terminal
// Exports: buildVFS(userSlug)

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ts(offsetMinutes = 0) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function tsLog(offsetMinutes = 0) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, ' ');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${mm} ${dd} ${hh}:${mi}:${ss}`;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function buildVFS(userSlug) {
  const home = `/home/${userSlug}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TREE
  // Maps directory paths → array of entry names (files + immediate subdirs)
  // ═══════════════════════════════════════════════════════════════════════════

  const tree = {
    '/': ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'lib64', 'lost+found', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'],

    // /bin
    '/bin': ['bash', 'cat', 'chmod', 'chown', 'cp', 'date', 'dd', 'df', 'dir', 'echo', 'false', 'grep', 'gunzip', 'gzip', 'hostname', 'kill', 'ln', 'ls', 'mkdir', 'mktemp', 'more', 'mount', 'mv', 'nano', 'netstat', 'ping', 'ps', 'pwd', 'rm', 'rmdir', 'sed', 'sh', 'sleep', 'sort', 'stty', 'su', 'sync', 'tar', 'touch', 'true', 'umount', 'uname', 'unlink', 'which'],

    // /boot
    '/boot': ['config-6.1.0-21-amd64', 'grub', 'initrd.img-6.1.0-21-amd64', 'System.map-6.1.0-21-amd64', 'vmlinuz-6.1.0-21-amd64'],
    '/boot/grub': ['grub.cfg', 'unicode.pf2', 'x86_64-efi'],
    '/boot/grub/x86_64-efi': ['acpi.mod', 'ahci.mod', 'all_video.mod', 'boot.mod', 'configfile.mod', 'ext2.mod', 'fat.mod', 'grub.efi', 'linux.mod', 'normal.mod', 'part_gpt.mod'],

    // /dev
    '/dev': ['block', 'char', 'disk', 'fd', 'full', 'input', 'log', 'loop0', 'loop1', 'loop2', 'mem', 'net', 'null', 'pts', 'random', 'sda', 'sda1', 'sda2', 'sda3', 'shm', 'stderr', 'stdin', 'stdout', 'tty', 'tty0', 'tty1', 'urandom', 'zero'],
    '/dev/net': ['tun'],
    '/dev/input': ['event0', 'event1', 'mice'],

    // /etc
    '/etc': [
      'adduser.conf', 'aliases', 'alternatives', 'apt', 'bash.bashrc', 'bash_completion.d',
      'bindresvport.blacklist', 'binfmt.d', 'ca-certificates', 'ca-certificates.conf',
      'cron.d', 'cron.daily', 'cron.hourly', 'cron.monthly', 'cron.weekly', 'crontab',
      'dbus-1', 'debconf.conf', 'debian_version', 'default', 'deluser.conf',
      'dpkg', 'environment', 'ethertypes', 'fail2ban', 'fstab', 'g2306', 'gai.conf',
      'group', 'group-', 'gshadow', 'gshadow-', 'host.conf', 'hostname', 'hosts',
      'hosts.allow', 'hosts.deny', 'init.d', 'inputrc', 'iproute2', 'issue',
      'issue.net', 'kernel', 'ld.so.cache', 'ld.so.conf', 'ld.so.conf.d',
      'locale.gen', 'localtime', 'logrotate.conf', 'logrotate.d',
      'login.defs', 'lsb-release', 'machine-id', 'mime.types',
      'motd', 'mtab', 'networks', 'nginx', 'nsswitch.conf', 'ntp.conf',
      'os-release', 'pam.conf', 'pam.d', 'passwd', 'passwd-',
      'profile', 'profile.d', 'protocols', 'python3', 'rc.local',
      'resolv.conf', 'rpc', 'rsyslog.conf', 'rsyslog.d', 'securetty',
      'security', 'services', 'shadow', 'shadow-', 'shells',
      'skel', 'ssh', 'ssl', 'subgid', 'subuid', 'sudoers', 'sudoers.d',
      'sysctl.conf', 'sysctl.d', 'systemd', 'terminfo', 'timezone',
      'udev', 'ufw', 'updatedb.conf', 'vim', 'wgetrc', 'xdg'
    ],
    '/etc/apt': ['apt.conf.d', 'auth.conf.d', 'keyrings', 'preferences.d', 'sources.list', 'sources.list.d', 'trusted.gpg.d'],
    '/etc/cron.d': ['e2scrub_all', 'g2306-backup', 'mdadm', 'sysstat'],
    '/etc/default': ['acpid', 'grub', 'keyboard', 'locale', 'networking', 'nss', 'rcS', 'rsyslog', 'ssh', 'ufw'],
    '/etc/fail2ban': ['action.d', 'fail2ban.conf', 'filter.d', 'jail.conf', 'jail.d', 'jail.local', 'paths-common.conf', 'paths-debian.conf'],
    '/etc/g2306': ['.env', 'backup.sh', 'config.json'],
    '/etc/init.d': ['cron', 'dbus', 'fail2ban', 'hostname.sh', 'kmod', 'networking', 'nginx', 'procps', 'rsyslog', 'ssh', 'ufw'],
    '/etc/nginx': ['conf.d', 'fastcgi.conf', 'fastcgi_params', 'koi-utf', 'koi-win', 'mime.types', 'modules-available', 'modules-enabled', 'nginx.conf', 'proxy_params', 'scgi_params', 'sites-available', 'sites-enabled', 'snippets', 'uwsgi_params', 'win-utf'],
    '/etc/nginx/sites-available': ['default', 'g2306'],
    '/etc/nginx/sites-enabled': ['default', 'g2306'],
    '/etc/nginx/conf.d': ['gzip.conf', 'security-headers.conf'],
    '/etc/nginx/snippets': ['fastcgi-php.conf', 'snakeoil.conf'],
    '/etc/ssh': ['moduli', 'ssh_config', 'ssh_config.d', 'sshd_config', 'sshd_config.d', 'ssh_host_ecdsa_key', 'ssh_host_ecdsa_key.pub', 'ssh_host_ed25519_key', 'ssh_host_ed25519_key.pub', 'ssh_host_rsa_key', 'ssh_host_rsa_key.pub'],
    '/etc/systemd': ['journald.conf', 'logind.conf', 'network', 'resolved.conf', 'system', 'system.conf', 'timesyncd.conf', 'user', 'user.conf'],
    '/etc/systemd/system': ['g2306.service', 'multi-user.target.wants', 'network-online.target.wants', 'sockets.target.wants', 'sysinit.target.wants', 'timers.target.wants'],
    '/etc/ufw': ['after.init', 'after.rules', 'after6.rules', 'applications.d', 'before.init', 'before.rules', 'before6.rules', 'sysctl.conf', 'ufw.conf', 'user.rules', 'user6.rules'],

    // /home
    '/home': [userSlug],
    [home]: ['.bash_history', '.bash_logout', '.bashrc', '.profile', '.ssh', 'logs', 'projects'],
    [`${home}/.ssh`]: ['authorized_keys', 'id_ed25519', 'id_ed25519.pub', 'known_hosts'],
    [`${home}/logs`]: ['access.log', 'deploy.log', 'error.log'],
    [`${home}/projects`]: ['g2306-node', 'notes.md', 'README.md'],
    [`${home}/projects/g2306-node`]: ['index.js', 'node_modules', 'package.json', 'package-lock.json', 'public', 'routes', 'views'],
    [`${home}/projects/g2306-node/routes`]: ['api.js', 'auth.js', 'index.js'],
    [`${home}/projects/g2306-node/views`]: ['404.html', 'index.html', 'portal.html'],
    [`${home}/projects/g2306-node/public`]: ['css', 'js', 'images'],

    // /lib
    '/lib': ['firmware', 'ifupdown', 'init', 'lsb', 'modprobe.d', 'modules', 'modules-load.d', 'systemd', 'terminfo', 'udev', 'x86_64-linux-gnu'],
    '/lib/x86_64-linux-gnu': [
      'ld-linux-x86-64.so.2', 'libanl.so.1', 'libaudit.so.1', 'libbpf.so.1',
      'libc.so.6', 'libcap.so.2', 'libcrypt.so.1', 'libdl.so.2',
      'libgcc_s.so.1', 'libm.so.6', 'libncurses.so.6', 'libnsl.so.1',
      'libnss_compat.so.2', 'libnss_dns.so.2', 'libnss_files.so.2',
      'libpam.so.0', 'libpam_misc.so.0', 'libpamc.so.0', 'libpcre2-8.so.0',
      'libpthread.so.0', 'libresolv.so.2', 'librt.so.1', 'libseccomp.so.2',
      'libselinux.so.1', 'libssl.so.3', 'libstdc++.so.6', 'libutil.so.1',
      'libz.so.1', 'security'
    ],
    '/lib/systemd': ['system', 'systemd', 'systemd-udevd'],
    '/lib/modules': ['6.1.0-21-amd64'],
    '/lib/modules/6.1.0-21-amd64': ['build', 'kernel', 'modules.alias', 'modules.alias.bin', 'modules.builtin', 'modules.dep', 'modules.dep.bin', 'modules.order', 'modules.symbols', 'source'],
    '/lib/firmware': ['bnx2', 'brcm', 'intel', 'iwlwifi-cc-a0-72.ucode', 'iwlwifi-so-a0-hr-b0-72.ucode', 'rtl_bt'],

    // /lib64
    '/lib64': ['ld-linux-x86-64.so.2'],

    // /opt
    '/opt': ['containerd', 'node', 'nodejs'],
    '/opt/node': ['bin', 'include', 'lib', 'share'],
    '/opt/node/bin': ['corepack', 'node', 'npm', 'npx'],
    '/opt/nodejs': ['18.19.0'],
    '/opt/nodejs/18.19.0': ['bin', 'lib', 'share'],

    // /proc
    '/proc': [
      '1', '10', '100', '101', '1023', '1024', '12', '13', '1337', '14', '15',
      'buddyinfo', 'bus', 'cgroups', 'cmdline', 'consoles', 'cpuinfo',
      'crypto', 'devices', 'diskstats', 'dma', 'driver', 'dynamic_debug',
      'execdomains', 'fb', 'filesystems', 'fs', 'interrupts', 'iomem',
      'ioports', 'irq', 'kallsyms', 'kcore', 'keys', 'key-users',
      'kmsg', 'kpagecgroup', 'kpagecount', 'kpageflags', 'loadavg',
      'locks', 'mdstat', 'meminfo', 'misc', 'modules', 'mounts',
      'net', 'pagetypeinfo', 'partitions', 'pressure', 'schedstat',
      'scsi', 'self', 'slabinfo', 'softirqs', 'stat', 'swaps',
      'sys', 'sysrq-trigger', 'sysvipc', 'thread-self', 'timer_list',
      'tty', 'uptime', 'version', 'vmallocinfo', 'vmstat', 'zoneinfo'
    ],
    '/proc/net': ['arp', 'dev', 'fib_trie', 'if_inet6', 'ipv6_route', 'netstat', 'route', 'snmp', 'sockstat', 'tcp', 'tcp6', 'udp', 'udp6', 'unix'],
    '/proc/1': ['cmdline', 'comm', 'environ', 'fd', 'maps', 'mem', 'mounts', 'net', 'ns', 'stat', 'status', 'wchan'],

    // /root
    '/root': ['.bash_history', '.bashrc', '.profile', '.ssh', '.vimrc', 'bin'],
    '/root/.ssh': ['authorized_keys', 'id_ed25519', 'id_ed25519.pub', 'known_hosts'],
    '/root/bin': ['backup.sh', 'health-check.sh', 'rotate-logs.sh'],

    // /run
    '/run': ['crond.pid', 'fail2ban', 'lock', 'log', 'mount', 'network', 'nginx.pid', 'sshd.pid', 'systemd', 'udev', 'user', 'utmp'],
    '/run/systemd': ['ask-password', 'generator', 'journal', 'network', 'notify', 'private', 'resolve', 'seats', 'sessions', 'transient', 'units'],
    '/run/user': ['1000'],
    '/run/user/1000': ['bus', 'gnupg', 'keyring', 'systemd'],

    // /sbin
    '/sbin': ['agetty', 'badblocks', 'blkid', 'blockdev', 'debugfs', 'depmod', 'dhclient', 'dmsetup', 'dosfsck', 'dumpe2fs', 'e2fsck', 'e2image', 'e2label', 'fdisk', 'findfs', 'fsck', 'fsck.ext2', 'fsck.ext3', 'fsck.ext4', 'fstab-decode', 'getty', 'halt', 'hdparm', 'hwclock', 'ifconfig', 'ifdown', 'ifup', 'init', 'insmod', 'ip', 'iptables', 'isosize', 'killall5', 'kmod', 'ldconfig', 'lsmod', 'mkdosfs', 'mke2fs', 'mkfs', 'mkfs.ext2', 'mkfs.ext3', 'mkfs.ext4', 'mkswap', 'modinfo', 'modprobe', 'nologin', 'parted', 'pivot_root', 'poweroff', 'reboot', 'resize2fs', 'rmmod', 'route', 'runlevel', 'shutdown', 'slattach', 'start-stop-daemon', 'sulogin', 'swaplabel', 'swapoff', 'swapon', 'sysctl', 'tune2fs', 'udevadm', 'update-grub', 'visudo'],

    // /srv
    '/srv': ['ftp', 'http'],
    '/srv/http': ['index.html'],
    '/srv/ftp': [],

    // /sys
    '/sys': ['block', 'bus', 'class', 'dev', 'devices', 'firmware', 'fs', 'kernel', 'module', 'power'],
    '/sys/block': ['loop0', 'loop1', 'loop2', 'sda'],
    '/sys/class': ['block', 'dmi', 'hwmon', 'leds', 'net', 'power_supply', 'thermal'],
    '/sys/devices': ['pci0000:00', 'platform', 'system', 'virtual'],

    // /tmp
    '/tmp': ['.ICE-unix', '.X11-unix', 'systemd-private-abc123-nginx.service-xyz456', 'tmpfiles.d'],

    // /usr
    '/usr': ['bin', 'games', 'include', 'lib', 'lib64', 'libexec', 'local', 'sbin', 'share', 'src'],
    '/usr/bin': [
      'awk', 'base64', 'basename', 'bc', 'bunzip2', 'bzip2', 'cal', 'clear',
      'curl', 'cut', 'diff', 'dig', 'dirname', 'dmesg', 'du', 'env',
      'expr', 'file', 'find', 'finger', 'free', 'ftp', 'gcc', 'git',
      'gpg', 'groups', 'head', 'id', 'install', 'iostat', 'ip',
      'journalctl', 'jq', 'kill', 'last', 'less', 'ln', 'lsb_release',
      'lscpu', 'lsof', 'lspci', 'make', 'man', 'md5sum', 'mkfifo',
      'nc', 'node', 'npm', 'nslookup', 'nmap', 'openssl', 'passwd',
      'patch', 'perl', 'pgrep', 'pkill', 'python3', 'readlink', 'rsync',
      'screen', 'sha1sum', 'sha256sum', 'ssh', 'ssh-add', 'ssh-agent',
      'ssh-keygen', 'ssh-keyscan', 'stat', 'strings', 'strace', 'su',
      'sudo', 'systemctl', 'tail', 'tar', 'tee', 'time', 'timeout',
      'top', 'tr', 'traceroute', 'tree', 'uniq', 'unzip', 'uptime',
      'useradd', 'userdel', 'usermod', 'vim', 'w', 'watch', 'wc',
      'wget', 'who', 'xargs', 'xxd', 'zip', 'zcat', 'zgrep'
    ],
    '/usr/local': ['bin', 'etc', 'games', 'include', 'lib', 'man', 'sbin', 'share', 'src'],
    '/usr/local/bin': ['certbot', 'composer', 'node', 'npm', 'npx', 'pm2'],
    '/usr/local/etc': ['g2306'],
    '/usr/local/etc/g2306': ['production.json'],
    '/usr/local/lib': ['node_modules', 'python3.11'],
    '/usr/local/lib/node_modules': ['npm', 'pm2'],
    '/usr/sbin': ['adduser', 'apache2ctl', 'chpasswd', 'chroot', 'cron', 'crontab', 'deluser', 'dpkg-reconfigure', 'fail2ban-client', 'fail2ban-server', 'groupadd', 'groupdel', 'groupmod', 'grpck', 'grpconv', 'grpunconv', 'invoke-rc.d', 'iptables-restore', 'iptables-save', 'logrotate', 'lsof', 'mkpasswd', 'nginx', 'ntpdate', 'pwck', 'pwconv', 'pwunconv', 'rsyslogd', 'service', 'sshd', 'tcpdump', 'ufw', 'update-alternatives', 'update-rc.d', 'useradd', 'userdel', 'usermod', 'visudo'],
    '/usr/share': ['applications', 'bash-completion', 'bug', 'common-licenses', 'doc', 'dpkg', 'info', 'lintian', 'locale', 'man', 'menu', 'misc', 'pam', 'perl5', 'pixmaps', 'vim', 'zoneinfo'],
    '/usr/lib': ['apt', 'binfmt.d', 'gcc', 'git-core', 'grub', 'locale', 'modules-load.d', 'nginx', 'os-release', 'python3', 'ssl', 'sysctl.d', 'systemd', 'tmpfiles.d', 'udev', 'x86_64-linux-gnu'],

    // /var
    '/var': ['backups', 'cache', 'crash', 'lib', 'local', 'lock', 'log', 'mail', 'opt', 'run', 'spool', 'tmp', 'www'],
    '/var/backups': ['apt.extended_states.0', 'dpkg.diversions.0', 'dpkg.status.0', 'dpkg.status.1.gz', 'g2306'],
    '/var/backups/g2306': ['g2306-20240115.tar.gz', 'g2306-20240201.tar.gz', 'g2306-20240215.tar.gz'],
    '/var/cache': ['apt', 'debconf', 'dpkg', 'fontconfig', 'ldconfig', 'man', 'nginx'],
    '/var/lib': ['apt', 'debconf', 'dpkg', 'fail2ban', 'misc', 'nginx', 'pam', 'pm2', 'systemd', 'ufw', 'urandom'],
    '/var/lib/fail2ban': ['fail2ban.sqlite3'],
    '/var/log': ['alternatives.log', 'apt', 'auth.log', 'btmp', 'debian-security-support', 'dpkg.log', 'fail2ban.log', 'fontconfig.log', 'kern.log', 'lastlog', 'mail.err', 'mail.log', 'mail.warn', 'messages', 'nginx', 'pm2', 'syslog', 'ufw.log', 'user.log', 'wtmp'],
    '/var/log/apt': ['history.log', 'term.log'],
    '/var/log/nginx': ['access.log', 'error.log', 'g2306-access.log', 'g2306-error.log'],
    '/var/log/pm2': ['g2306-app-0-err.log', 'g2306-app-0-out.log', 'pm2.log'],
    '/var/www': ['html'],
    '/var/www/html': ['404.html', 'index.html'],
    '/var/spool': ['cron', 'mail', 'mqueue'],
    '/var/spool/cron': ['crontabs'],
    [`/var/spool/cron/crontabs`]: ['root', userSlug],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TEXT FILE CONTENTS
  // Maps file paths → array of text lines
  // ═══════════════════════════════════════════════════════════════════════════

  const files = {

    // ── /etc ──────────────────────────────────────────────────────────────────
    '/etc/hostname': [`g2306-node`],
    '/etc/os-release': [
      `PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"`,
      `NAME="Debian GNU/Linux"`,
      `VERSION_ID="12"`,
      `VERSION="12 (bookworm)"`,
      `VERSION_CODENAME=bookworm`,
      `ID=debian`,
      `HOME_URL="https://www.debian.org/"`,
      `SUPPORT_URL="https://www.debian.org/support"`,
      `BUG_REPORT_URL="https://bugs.debian.org/"`,
    ],
    '/etc/debian_version': [`12.4`],
    '/etc/timezone': [`Asia/Shanghai`],
    '/etc/environment': [`PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"`, `LANG=en_US.UTF-8`],
    '/etc/issue': [`Debian GNU/Linux 12 \\n \\l`, ``],
    '/etc/issue.net': [`Debian GNU/Linux 12`],
    '/etc/motd': [
      ``,
      `  ██████╗ ██████╗ ██████╗  ██████╗  ██████╗`,
      `  ██╔════╝╚════██╗██╔══██╗██╔═══██╗██╔════╝`,
      `  ██║  ███╗ █████╔╝██████╔╝██║   ██║███████╗`,
      `  ██║   ██║██╔═══╝ ██╔══██╗██║   ██║██╔══██║`,
      `  ╚██████╔╝███████╗██║  ██║╚██████╔╝╚██████╔╝`,
      `   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝`,
      ``,
      `  G2306 ALUMNI NETWORK NODE  //  AUTHORIZED ACCESS ONLY`,
      `  Debian 12 (bookworm)  |  Kernel 6.1.0-21-amd64`,
      ``,
    ],
    '/etc/hosts': [
      `127.0.0.1   localhost`,
      `127.0.1.1   g2306-node`,
      `::1         localhost ip6-localhost ip6-loopback`,
      `fe00::0     ip6-localnet`,
      `ff00::0     ip6-mcastprefix`,
      `ff02::1     ip6-allnodes`,
      `ff02::2     ip6-allrouters`,
    ],
    '/etc/hosts.allow': [`# /etc/hosts.allow: list of hosts permitted to access the system`, `sshd: 10.0.0.0/8`],
    '/etc/hosts.deny': [`# /etc/hosts.deny: list of hosts forbidden to access the system`, `ALL: ALL`],
    '/etc/resolv.conf': [
      `# Generated by NetworkManager`,
      `nameserver 1.1.1.1`,
      `nameserver 8.8.8.8`,
      `search g2306.local`,
    ],
    '/etc/nsswitch.conf': [
      `passwd:         files systemd`,
      `group:          files systemd`,
      `shadow:         files`,
      `hosts:          files dns`,
      `networks:       files`,
      `protocols:      db files`,
      `services:       db files`,
      `ethers:         db files`,
      `rpc:            db files`,
    ],
    '/etc/passwd': [
      `root:x:0:0:root:/root:/bin/bash`,
      `daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin`,
      `bin:x:2:2:bin:/bin:/usr/sbin/nologin`,
      `sys:x:3:3:sys:/dev:/usr/sbin/nologin`,
      `sync:x:4:65534:sync:/bin:/bin/sync`,
      `games:x:5:60:games:/usr/games:/usr/sbin/nologin`,
      `man:x:6:12:man:/var/cache/man:/usr/sbin/nologin`,
      `www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin`,
      `nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin`,
      `sshd:x:105:65534::/run/sshd:/usr/sbin/nologin`,
      `${userSlug}:x:1000:1000:,,,:/home/${userSlug}:/bin/bash`,
    ],
    '/etc/group': [
      `root:x:0:`,
      `daemon:x:1:`,
      `bin:x:2:`,
      `sys:x:3:`,
      `www-data:x:33:`,
      `sudo:x:27:${userSlug}`,
      `${userSlug}:x:1000:`,
    ],
    '/etc/shells': [
      `/bin/sh`, `/bin/bash`, `/usr/bin/bash`, `/bin/dash`,
      `/usr/bin/dash`, `/usr/bin/zsh`, `/bin/zsh`,
    ],
    '/etc/fstab': [
      `# /etc/fstab: static file system information.`,
      `# <file system> <mount point>   <type>  <options>       <dump>  <pass>`,
      `UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890 / ext4 errors=remount-ro 0 1`,
      `UUID=b2c3d4e5-f6a7-8901-bcde-f12345678901 /boot/efi vfat umask=0077 0 1`,
      `UUID=c3d4e5f6-a7b8-9012-cdef-123456789012 none swap sw 0 0`,
    ],
    '/etc/profile': [
      `# /etc/profile: system-wide .profile file for the Bourne shell`,
      `if [ "\${PS1}" ]; then`,
      `  if [ "$BASH" ] && [ "$BASH" != "/bin/sh" ]; then`,
      `    if [ -f /etc/bash.bashrc ]; then . /etc/bash.bashrc; fi`,
      `  fi`,
      `fi`,
      `if [ -d /etc/profile.d ]; then`,
      `  for i in /etc/profile.d/*.sh; do`,
      `    if [ -r $i ]; then . $i; fi`,
      `  done`,
      `  unset i`,
      `fi`,
    ],
    '/etc/bash.bashrc': [
      `# System-wide .bashrc for interactive bash(1) shells.`,
      `if [ -z "$PS1" ]; then return; fi`,
      `PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '`,
      `shopt -s checkwinsize`,
      `[ -x /usr/lib/command-not-found ] && function command_not_found_handle { /usr/lib/command-not-found -- "$1"; }`,
    ],
    '/etc/sysctl.conf': [
      `# /etc/sysctl.conf - Configuration file for setting system variables`,
      `net.ipv4.ip_forward=0`,
      `net.ipv6.conf.all.forwarding=0`,
      `net.ipv4.conf.default.rp_filter=1`,
      `net.ipv4.conf.all.rp_filter=1`,
      `net.ipv4.tcp_syncookies=1`,
      `kernel.dmesg_restrict=1`,
      `fs.protected_hardlinks=1`,
      `fs.protected_symlinks=1`,
    ],
    '/etc/login.defs': [
      `MAIL_DIR        /var/mail`,
      `FAILLOG_ENAB    yes`,
      `LOG_UNKFAIL_ENAB  no`,
      `LOG_OK_LOGINS   no`,
      `SYSLOG_SU_ENAB  yes`,
      `SYSLOG_SG_ENAB  yes`,
      `PASS_MAX_DAYS   99999`,
      `PASS_MIN_DAYS   0`,
      `PASS_WARN_AGE   7`,
      `UID_MIN         1000`,
      `UID_MAX         60000`,
      `GID_MIN         1000`,
      `GID_MAX         60000`,
      `UMASK           022`,
      `HOME_MODE       0750`,
      `CREATE_HOME     yes`,
      `USERGROUPS_ENAB yes`,
      `ENCRYPT_METHOD  SHA512`,
    ],
    '/etc/apt/sources.list': [
      `# Debian 12 bookworm`,
      `deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware`,
      `deb http://security.debian.org/debian-security bookworm-security main contrib non-free`,
      `deb http://deb.debian.org/debian bookworm-updates main contrib non-free`,
    ],
    '/etc/cron.d/g2306-backup': [
      `# G2306 nightly backup`,
      `0 3 * * * root /etc/g2306/backup.sh >> /var/log/g2306-backup.log 2>&1`,
    ],

    // ── /etc/g2306 ────────────────────────────────────────────────────────────
    '/etc/g2306/.env': [
      `# G2306 NODE SERVER CONFIGURATION`,
      `# Edit with: vim /etc/g2306/.env  then  :w KEY=VALUE`,
      `SERVER_HOSTNAME=`,
      `SERVER_PORTS=22,80`,
      `SERVER_DIFFICULTY=2`,
      `SERVER_THEME=DEFAULT`,
      `HACK_LOOT=`,
    ],
    '/etc/g2306/config.json': [
      `{`,
      `  "node_id": "g2306-node-01",`,
      `  "api_base": "https://g2306-cengfan-api.workers.dev",`,
      `  "log_level": "info",`,
      `  "max_connections": 100,`,
      `  "timeout_ms": 5000,`,
      `  "retry_attempts": 3`,
      `}`,
    ],
    '/etc/g2306/backup.sh': [
      `#!/bin/bash`,
      `# G2306 backup script`,
      `set -e`,
      `BACKUP_DIR=/var/backups/g2306`,
      `DATE=$(date +%Y%m%d)`,
      `mkdir -p $BACKUP_DIR`,
      `tar czf $BACKUP_DIR/g2306-$DATE.tar.gz /etc/g2306 /var/log/nginx`,
      `find $BACKUP_DIR -mtime +30 -delete`,
      `echo "Backup complete: $BACKUP_DIR/g2306-$DATE.tar.gz"`,
    ],

    // ── /etc/nginx ────────────────────────────────────────────────────────────
    '/etc/nginx/nginx.conf': [
      `user www-data;`,
      `worker_processes auto;`,
      `pid /run/nginx.pid;`,
      `include /etc/nginx/modules-enabled/*.conf;`,
      ``,
      `events {`,
      `    worker_connections 768;`,
      `}`,
      ``,
      `http {`,
      `    sendfile on;`,
      `    tcp_nopush on;`,
      `    types_hash_max_size 2048;`,
      `    server_tokens off;`,
      ``,
      `    include /etc/nginx/mime.types;`,
      `    default_type application/octet-stream;`,
      ``,
      `    ssl_protocols TLSv1.2 TLSv1.3;`,
      `    ssl_prefer_server_ciphers on;`,
      ``,
      `    access_log /var/log/nginx/access.log;`,
      `    error_log /var/log/nginx/error.log;`,
      ``,
      `    gzip on;`,
      `    include /etc/nginx/conf.d/*.conf;`,
      `    include /etc/nginx/sites-enabled/*;`,
      `}`,
    ],
    '/etc/nginx/sites-available/default': [
      `server {`,
      `    listen 80 default_server;`,
      `    listen [::]:80 default_server;`,
      `    root /var/www/html;`,
      `    index index.html index.htm;`,
      `    server_name _;`,
      `    location / {`,
      `        try_files $uri $uri/ =404;`,
      `    }`,
      `}`,
    ],
    '/etc/nginx/sites-available/g2306': [
      `server {`,
      `    listen 80;`,
      `    server_name g2306-node;`,
      `    root /var/www/html;`,
      ``,
      `    location /api/ {`,
      `        proxy_pass http://127.0.0.1:3000;`,
      `        proxy_http_version 1.1;`,
      `        proxy_set_header Host $host;`,
      `        proxy_set_header X-Real-IP $remote_addr;`,
      `    }`,
      ``,
      `    location / {`,
      `        try_files $uri $uri/ /index.html;`,
      `    }`,
      ``,
      `    access_log /var/log/nginx/g2306-access.log;`,
      `    error_log  /var/log/nginx/g2306-error.log;`,
      `}`,
    ],

    // ── /etc/ssh ──────────────────────────────────────────────────────────────
    '/etc/ssh/sshd_config': [
      `Port 22`,
      `AddressFamily any`,
      `ListenAddress 0.0.0.0`,
      `HostKey /etc/ssh/ssh_host_rsa_key`,
      `HostKey /etc/ssh/ssh_host_ecdsa_key`,
      `HostKey /etc/ssh/ssh_host_ed25519_key`,
      `SyslogFacility AUTH`,
      `LogLevel INFO`,
      `LoginGraceTime 2m`,
      `PermitRootLogin no`,
      `StrictModes yes`,
      `MaxAuthTries 3`,
      `MaxSessions 10`,
      `PubkeyAuthentication yes`,
      `AuthorizedKeysFile .ssh/authorized_keys`,
      `PasswordAuthentication no`,
      `PermitEmptyPasswords no`,
      `ChallengeResponseAuthentication no`,
      `UsePAM yes`,
      `X11Forwarding no`,
      `PrintMotd yes`,
      `AcceptEnv LANG LC_*`,
      `Subsystem sftp /usr/lib/openssh/sftp-server`,
    ],
    '/etc/ssh/ssh_config': [
      `# This is the ssh client system-wide configuration file.`,
      `Host *`,
      `    SendEnv LANG LC_*`,
      `    HashKnownHosts yes`,
      `    GSSAPIAuthentication yes`,
      `    ServerAliveInterval 60`,
      `    ServerAliveCountMax 3`,
    ],
    '/etc/ssh/ssh_host_rsa_key.pub': [
      `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7... root@g2306-node`,
    ],
    '/etc/ssh/ssh_host_ed25519_key.pub': [
      `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILk3... root@g2306-node`,
    ],

    // ── /etc/systemd ──────────────────────────────────────────────────────────
    '/etc/systemd/system/g2306.service': [
      `[Unit]`,
      `Description=G2306 Alumni Network Node API`,
      `Documentation=https://github.com/g2306/alumni-net`,
      `After=network.target`,
      `Wants=network-online.target`,
      ``,
      `[Service]`,
      `Type=simple`,
      `User=${userSlug}`,
      `WorkingDirectory=${home}/projects/g2306-node`,
      `ExecStart=/usr/bin/node index.js`,
      `Restart=on-failure`,
      `RestartSec=5`,
      `Environment=NODE_ENV=production`,
      `EnvironmentFile=/etc/g2306/.env`,
      `StandardOutput=journal`,
      `StandardError=journal`,
      ``,
      `[Install]`,
      `WantedBy=multi-user.target`,
    ],

    // ── /proc ─────────────────────────────────────────────────────────────────
    '/proc/version': [
      `Linux version 6.1.0-21-amd64 (debian-kernel@lists.debian.org) (gcc version 12.2.0 (Debian 12.2.0-14)) #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 (2024-05-03)`,
    ],
    '/proc/cmdline': [
      `BOOT_IMAGE=/boot/vmlinuz-6.1.0-21-amd64 root=UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890 ro quiet splash`,
    ],
    '/proc/uptime': [`${(86400 + Math.floor(Math.random()*864000)).toFixed(2)} ${(40000 + Math.floor(Math.random()*400000)).toFixed(2)}`],
    '/proc/loadavg': [`0.12 0.08 0.05 1/312 14823`],
    '/proc/cpuinfo': [
      `processor	: 0`,
      `vendor_id	: GenuineIntel`,
      `cpu family	: 6`,
      `model		: 85`,
      `model name	: Intel(R) Xeon(R) Gold 6130 CPU @ 2.10GHz`,
      `stepping	: 4`,
      `cpu MHz		: 2100.000`,
      `cache size	: 22528 KB`,
      `bogomips	: 4200.00`,
      `flags		: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss syscall nx pdpe1gb rdtscp lm constant_tsc`,
      `address sizes	: 46 bits physical, 48 bits virtual`,
    ],
    '/proc/meminfo': [
      `MemTotal:        2048000 kB`,
      `MemFree:          412800 kB`,
      `MemAvailable:     819200 kB`,
      `Buffers:           65536 kB`,
      `Cached:           409600 kB`,
      `SwapCached:            0 kB`,
      `Active:           614400 kB`,
      `Inactive:         307200 kB`,
      `SwapTotal:        524288 kB`,
      `SwapFree:         524288 kB`,
      `Dirty:               128 kB`,
      `Writeback:             0 kB`,
      `AnonPages:        512000 kB`,
      `Mapped:           131072 kB`,
      `Shmem:             20480 kB`,
      `KReclaimable:      65536 kB`,
      `VmallocTotal:   34359738367 kB`,
      `HugePages_Total:       0`,
    ],
    '/proc/mounts': [
      `sysfs /sys sysfs rw,nosuid,nodev,noexec,relatime 0 0`,
      `proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0`,
      `devtmpfs /dev devtmpfs rw,nosuid,size=1024k,nr_inodes=4096,mode=755 0 0`,
      `/dev/sda1 / ext4 rw,relatime,errors=remount-ro 0 0`,
      `/dev/sda2 /boot/efi vfat rw,relatime,fmask=0077,dmask=0077 0 0`,
      `tmpfs /tmp tmpfs rw,nosuid,nodev 0 0`,
    ],
    '/proc/net/arp': [
      `IP address       HW type     Flags       HW address            Mask     Device`,
      `10.0.0.1         0x1         0x2         52:54:00:12:34:56     *        eth0`,
      `10.0.0.2         0x1         0x2         52:54:00:ab:cd:ef     *        eth0`,
    ],
    '/proc/net/dev': [
      `Inter-|   Receive                                                |  Transmit`,
      ` face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed`,
      `    lo:    8192      64    0    0    0     0          0         0     8192      64    0    0    0     0       0          0`,
      `  eth0: 52428800   51200    0    0    0     0          0         0  10485760   10240    0    0    0     0       0          0`,
    ],

    // ── /var/log ──────────────────────────────────────────────────────────────
    '/var/log/syslog': [
      `${tsLog(60)} g2306-node kernel: [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x00000000]`,
      `${tsLog(55)} g2306-node systemd[1]: Started G2306 Alumni Network Node API.`,
      `${tsLog(50)} g2306-node systemd[1]: Started nginx - High Performance Web Server.`,
      `${tsLog(45)} g2306-node cron[892]: (CRON) INFO (pidfile fd = 3)`,
      `${tsLog(30)} g2306-node systemd[1]: g2306.service: Reloading.`,
      `${tsLog(10)} g2306-node kernel: [143210.123456] eth0: renamed from veth8f3a21`,
      `${tsLog(5)}  g2306-node systemd[1]: Starting Daily apt upgrade and clean activities...`,
      `${tsLog(2)}  g2306-node rsyslogd: [origin software="rsyslogd" swVersion="8.2302.0" x-pid="891"]`,
    ],
    '/var/log/auth.log': [
      `${tsLog(120)} g2306-node sshd[1234]: Server listening on 0.0.0.0 port 22.`,
      `${tsLog(90)}  g2306-node sshd[2001]: Invalid user admin from 185.220.101.32 port 49234`,
      `${tsLog(80)}  g2306-node sshd[2001]: Connection closed by invalid user admin 185.220.101.32 port 49234 [preauth]`,
      `${tsLog(60)}  g2306-node sshd[2100]: Accepted publickey for ${userSlug} from 10.0.0.5 port 52341 ssh2: ED25519 SHA256:abc123`,
      `${tsLog(60)}  g2306-node sshd[2100]: pam_unix(sshd:session): session opened for user ${userSlug}(uid=1000) by (uid=0)`,
      `${tsLog(10)}  g2306-node sudo: ${userSlug} : TTY=pts/0 ; PWD=/home/${userSlug} ; USER=root ; COMMAND=/usr/bin/systemctl status g2306`,
    ],
    '/var/log/kern.log': [
      `${tsLog(120)} g2306-node kernel: [    0.000000] Linux version 6.1.0-21-amd64`,
      `${tsLog(119)} g2306-node kernel: [    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=a1b2c3d4`,
      `${tsLog(118)} g2306-node kernel: [    1.234567] systemd[1]: Detected virtualization kvm.`,
      `${tsLog(117)} g2306-node kernel: [    2.345678] eth0: renamed from veth0`,
      `${tsLog(10)}  g2306-node kernel: [143200.000001] NET: Registered PF_INET6 protocol family`,
    ],
    '/var/log/dpkg.log': [
      `${ts(60 * 24 * 3)} status installed libc6:amd64 2.36-9+deb12u4`,
      `${ts(60 * 24 * 3)} status installed openssl 3.0.11-1~deb12u2`,
      `${ts(60 * 24 * 2)} install nginx 1.22.1-9 1.22.1-9`,
      `${ts(60 * 24 * 2)} status installed nginx 1.22.1-9`,
      `${ts(60 * 24 * 1)} upgrade nodejs 18.13.0+dfsg1-1 18.19.0+dfsg-6~deb12u1`,
    ],
    '/var/log/fail2ban.log': [
      `${ts(90)}  fail2ban.server         [892]: INFO    --------------------------------------------------`,
      `${ts(90)}  fail2ban.server         [892]: INFO    Starting Fail2ban v1.0.2`,
      `${ts(80)}  fail2ban.filter         [892]: INFO    [sshd] Found 185.220.101.32 - ${ts(80)}`,
      `${ts(80)}  fail2ban.actions        [892]: NOTICE  [sshd] Ban 185.220.101.32`,
      `${ts(30)}  fail2ban.filter         [892]: INFO    [sshd] Found 45.95.147.23 - ${ts(30)}`,
      `${ts(30)}  fail2ban.actions        [892]: NOTICE  [sshd] Ban 45.95.147.23`,
    ],
    '/var/log/ufw.log': [
      `${tsLog(90)} g2306-node kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:ab:cd:ef SRC=185.220.101.32 DST=10.0.0.10 PROTO=TCP DPT=22`,
      `${tsLog(30)} g2306-node kernel: [UFW ALLOW] IN=eth0 OUT= MAC=52:54:00:ab:cd:ef SRC=10.0.0.5 DST=10.0.0.10 PROTO=TCP DPT=22`,
    ],
    '/var/log/nginx/access.log': [
      `10.0.0.5 - - [${ts()}] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"`,
      `10.0.0.5 - - [${ts()}] "GET /api/map/data HTTP/1.1" 200 8192 "-" "Mozilla/5.0"`,
      `185.220.101.32 - - [${ts()}] "GET /.env HTTP/1.1" 404 134 "-" "curl/7.88.1"`,
      `185.220.101.32 - - [${ts()}] "GET /wp-admin/ HTTP/1.1" 404 134 "-" "curl/7.88.1"`,
      `10.0.0.5 - - [${ts()}] "POST /api/auth/login HTTP/1.1" 200 256 "-" "Mozilla/5.0"`,
    ],
    '/var/log/nginx/error.log': [
      `${ts(30)} [warn] 892#892: conflicting server name "g2306-node" on 0.0.0.0:80, ignored`,
      `${ts(5)}  [error] 892#892: *4 open() "/var/www/html/favicon.ico" failed (2: No such file or directory)`,
    ],
    '/var/log/apt/history.log': [
      `Start-Date: ${ts(60 * 24 * 2)}`,
      `Commandline: apt-get -y upgrade`,
      `Upgrade: libc6:amd64 (2.36-9+deb12u3, 2.36-9+deb12u4), openssl:amd64 (3.0.11-1, 3.0.11-1~deb12u2)`,
      `End-Date: ${ts(60 * 24 * 2)}`,
    ],

    // ── /var/www ──────────────────────────────────────────────────────────────
    '/var/www/html/index.html': [
      `<!DOCTYPE html>`,
      `<html lang="en">`,
      `<head><meta charset="UTF-8"><title>G2306 Node</title></head>`,
      `<body style="background:#050709;color:#b8ff47;font-family:monospace;padding:40px">`,
      `  <h1>G2306 ALUMNI NETWORK NODE</h1>`,
      `  <p>Authorized access only. All activity is monitored and logged.</p>`,
      `</body></html>`,
    ],
    '/var/www/html/404.html': [
      `<!DOCTYPE html><html><head><title>404 Not Found</title></head>`,
      `<body><h1>404 Not Found</h1><p>nginx/1.22.1</p></body></html>`,
    ],

    // ── /home/${userSlug} ─────────────────────────────────────────────────────
    [`${home}/.bashrc`]: [
      `# ~/.bashrc: executed by bash(1) for non-login shells.`,
      `case $- in`,
      `    *i*) ;;`,
      `      *) return;;`,
      `esac`,
      `HISTCONTROL=ignoreboth`,
      `HISTSIZE=1000`,
      `HISTFILESIZE=2000`,
      `shopt -s histappend`,
      `shopt -s checkwinsize`,
      `export PS1='\\[\\033[01;32m\\]\\u@g2306-node\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '`,
      `export PATH="$HOME/.local/bin:$PATH"`,
      `alias ll='ls -alF'`,
      `alias la='ls -A'`,
      `alias l='ls -CF'`,
      `alias grep='grep --color=auto'`,
      `alias df='df -h'`,
      `alias du='du -h'`,
    ],
    [`${home}/.profile`]: [
      `# ~/.profile: executed by the command interpreter for login shells.`,
      `if [ -n "$BASH_VERSION" ]; then`,
      `    if [ -f "$HOME/.bashrc" ]; then`,
      `        . "$HOME/.bashrc"`,
      `    fi`,
      `fi`,
      `if [ -d "$HOME/bin" ] ; then`,
      `    PATH="$HOME/bin:$PATH"`,
      `fi`,
    ],
    [`${home}/.bash_logout`]: [
      `# ~/.bash_logout: executed by bash when login shell exits.`,
      `if [ "$SHLVL" = 1 ]; then`,
      `    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q`,
      `fi`,
    ],
    [`${home}/.bash_history`]: [
      `ls -la`,
      `cd projects/g2306-node`,
      `node index.js`,
      `systemctl status g2306`,
      `sudo systemctl restart g2306`,
      `cat /var/log/nginx/access.log`,
      `vim /etc/g2306/.env`,
      `git log --oneline -10`,
      `curl localhost:3000/api/health`,
      `sudo ufw status`,
      `tail -f /var/log/g2306.log`,
      `history`,
    ],
    [`${home}/.ssh/authorized_keys`]: [
      `# Authorized SSH keys for ${userSlug}@g2306-node`,
      `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGv8... ${userSlug}@workstation`,
    ],
    [`${home}/.ssh/id_ed25519.pub`]: [
      `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOx9... ${userSlug}@g2306-node`,
    ],
    [`${home}/.ssh/known_hosts`]: [
      `github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGm...`,
      `|1|abc123def456==| ecdsa-sha2-nistp256 AAAA...`,
    ],
    [`${home}/logs/access.log`]: [
      `${ts(120)} [INFO]  SSH login from 10.0.0.5 as ${userSlug}`,
      `${ts(90)}  [INFO]  Session opened`,
      `${ts(60)}  [INFO]  Command: ls /etc`,
      `${ts(30)}  [WARN]  Failed auth attempt from 185.220.101.32`,
      `${ts(5)}   [INFO]  Command: cat /etc/g2306/.env`,
    ],
    [`${home}/logs/error.log`]: [
      `${ts(300)} [ERROR] Connection refused: port 8080 not bound`,
      `${ts(200)} [WARN]  Disk usage at 74% on /dev/sda1`,
      `${ts(60)}  [INFO]  Service g2306-node restarted successfully`,
    ],
    [`${home}/logs/deploy.log`]: [
      `${ts(60 * 24 * 7)} [DEPLOY] Starting deployment v2.3.1`,
      `${ts(60 * 24 * 7)} [DEPLOY] npm install --production`,
      `${ts(60 * 24 * 7)} [DEPLOY] systemctl restart g2306`,
      `${ts(60 * 24 * 7)} [DEPLOY] Health check: OK`,
      `${ts(60 * 24 * 7)} [DEPLOY] Deployment complete`,
    ],
    [`${home}/projects/README.md`]: [
      `# ${userSlug}'s Projects`,
      ``,
      `## g2306-node`,
      `G2306 Alumni Network local node service.`,
      `Connects to the central API at g2306-cengfan-api.workers.dev`,
      ``,
      `## Notes`,
      `See notes.md for TODO items.`,
    ],
    [`${home}/projects/notes.md`]: [
      `# Notes`,
      ``,
      `## TODO`,
      `- [ ] Update server config in /etc/g2306/.env`,
      `- [ ] Set HACK_LOOT message for other students`,
      `- [ ] Review nginx config`,
      `- [x] Setup SSH key auth`,
      `- [x] Configure firewall`,
    ],
    [`${home}/projects/g2306-node/index.js`]: [
      `'use strict';`,
      `const express = require('express');`,
      `const app = express();`,
      `const PORT = process.env.PORT || 3000;`,
      ``,
      `app.use(express.json());`,
      `app.use('/api', require('./routes/api'));`,
      `app.use('/api/auth', require('./routes/auth'));`,
      ``,
      `app.get('/api/health', (req, res) => {`,
      `  res.json({ status: 'ok', node: process.env.SERVER_HOSTNAME });`,
      `});`,
      ``,
      `app.listen(PORT, () => console.log(\`G2306 node listening on :\${PORT}\`));`,
    ],
    [`${home}/projects/g2306-node/package.json`]: [
      `{`,
      `  "name": "g2306-node",`,
      `  "version": "2.3.1",`,
      `  "description": "G2306 Alumni Network local node",`,
      `  "main": "index.js",`,
      `  "scripts": {`,
      `    "start": "node index.js",`,
      `    "dev": "nodemon index.js"`,
      `  },`,
      `  "dependencies": {`,
      `    "express": "^4.18.2",`,
      `    "jsonwebtoken": "^9.0.2"`,
      `  }`,
      `}`,
    ],

    // ── /root ─────────────────────────────────────────────────────────────────
    '/root/.bashrc': [
      `# Root bashrc`,
      `export PS1='\\[\\033[01;31m\\]\\u@g2306-node\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\# '`,
      `alias ll='ls -alF'`,
      `alias la='ls -A'`,
    ],

    // ── /srv ──────────────────────────────────────────────────────────────────
    '/srv/http/index.html': [
      `<!DOCTYPE html><html><head><title>G2306</title></head>`,
      `<body><p>G2306 Node Service</p></body></html>`,
    ],

    // ── /usr/local/etc/g2306 ─────────────────────────────────────────────────
    '/usr/local/etc/g2306/production.json': [
      `{`,
      `  "env": "production",`,
      `  "api": "https://g2306-cengfan-api.workers.dev",`,
      `  "log_dir": "/var/log",`,
      `  "pid_file": "/run/g2306.pid"`,
      `}`,
    ],

    // ── /var/spool/cron/crontabs ──────────────────────────────────────────────
    [`/var/spool/cron/crontabs/${userSlug}`]: [
      `# DO NOT EDIT THIS FILE - edit the master and reinstall.`,
      `# (${userSlug} installed on ${ts()})`,
      `0 */6 * * * /home/${userSlug}/projects/g2306-node/scripts/health-check.sh`,
    ],
    '/var/spool/cron/crontabs/root': [
      `# DO NOT EDIT THIS FILE - edit the master and reinstall.`,
      `@reboot /etc/g2306/backup.sh`,
      `0 3 * * * /etc/g2306/backup.sh >> /var/log/g2306-backup.log 2>&1`,
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: BINARY FILES
  // These paths return hex/binary output when cat'd
  // ═══════════════════════════════════════════════════════════════════════════

  const BIN_DIRS = [
    '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin',
    '/lib/x86_64-linux-gnu', '/lib64', '/lib/systemd',
    '/boot',
  ];

  // Build binary set from tree entries in binary dirs
  const binaries = new Set();
  for (const [dir, entries] of Object.entries(tree)) {
    if (BIN_DIRS.some(bd => dir === bd)) {
      for (const e of entries) binaries.add(`${dir}/${e}`);
    }
  }
  // Specific binary files that don't live in above dirs
  [
    '/lib/modules/6.1.0-21-amd64/modules.dep.bin',
    '/lib/modules/6.1.0-21-amd64/modules.alias.bin',
    '/lib64/ld-linux-x86-64.so.2',
    '/etc/ssh/ssh_host_rsa_key',
    '/etc/ssh/ssh_host_ecdsa_key',
    '/etc/ssh/ssh_host_ed25519_key',
    '/etc/ld.so.cache',
    '/var/lib/fail2ban/fail2ban.sqlite3',
  ].forEach(p => binaries.add(p));

  return { tree, files, binaries };
}



