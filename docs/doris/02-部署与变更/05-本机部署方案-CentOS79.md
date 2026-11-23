# 本机部署方案 · CentOS 7.9 / 192.168.16.24（1FE+1BE）

> 目标机器：`srvalcyuatvdbs001`，CentOS 7.9.2009，IP `192.168.16.24/24`（网卡 ens192），内存约 16 GB。
> **同机已有**：MySQL 5.7（数据在 `/data/mysql_57`，占 58 GB）、三个看板脚本（`/opt/asset-dashboard`、`/opt/host-dashboard`、`/opt/net-dashboard`）、Percona XtraBackup（`/opt/xtrabackup`）。
> 通用原理与每条命令的依据见 [安装部署照做清单](/doris/02-部署与变更/04-安装部署照做清单)；**本文只写这台机器要执行的命令、填好的参数和它会踩的雷。**

---

## 0. 能装吗？——先看结论，再看体检

**结论：可以装，属于"单机实验/学习"级别，不适合放真实业务数据。**

| 项 | 本机情况 | 官方要求（4.x） | 判定 |
|---|---|---|---|
| 操作系统 | CentOS 7.9 | CentOS 7+ / Ubuntu 22.04+ | 满足（但见雷区 1、2） |
| CPU | Xeon Gold 6326 @2.90GHz，8 核；**AVX2 已确认支持** | 支持 AVX2 | 满足，用标准 x64 包 |
| 内存 | 15 G，可用 10 G；mysqld 占 3.8 G；swap=0 | 测试：FE 8G + BE 16G | 够跑实验 |
| 磁盘 | `/` 剩 41 GB；`/data` 剩 43 GB，但其中 58 GB 是 MySQL | 测试：BE 50G+ | **Doris 全部放 `/`，与 MySQL 分区分开**（见 0.3） |
| JDK | 系统大概率是 1.8 | **17+** | 必须另装（雷区 3） |
| glibc | 2.17（CentOS 7 上限） | 官方未明写最低版本 | 有风险（雷区 2） |

::: tip 2026-11-23 体检结果（全部通过，可以开工）

| 检查项 | 结果 | 结论 |
|---|---|---|
| CPU | Intel Xeon Gold 6326 @2.90GHz，8 核切片 | 够用（官方测试最低 8 核） |
| AVX2 | `grep -o avx2 /proc/cpuinfo` **有输出** | 用标准 x64 包，不用换 no-avx2 |
| 内存 | 15 G total，used 4 G，available 10 G | 够跑 |
| mysqld 实占 | RSS **3.8 G** | 剩 6 G 以上可分配给 Doris |
| Swap | 0 | 已满足要求，跳过 `swapoff` |
| 8030 / 8040 / 9030 | 无监听 | 端口全空，不用改端口 |
| 负载 | 0.00 / 0.01 / 0.05，开机 91 天 | 机器很闲，可开 |

**内存账**：mysqld 3.8 G + FE 3 G（堆）+ FE 其他约 0.8 G + BE 上限 30%（4.8 G）≈ **12.4 G**，内核还有 2 G 余量。BE 的 30% 只是上限，空闲时实际只占 1–2 G，会随缓存慢慢涨。
:::

::: warning 装之前先确认一件事
这台机器不是空的：MySQL 5.7 + 3 个看板 + xtrabackup 都在跑。Doris 起来后会常驻占用 **6–8 GB 内存**和 8 个端口。
- 内存要跟 MySQL 抢：先用 0.1 第 1b 段看 mysqld 实际占多少；
- 磁盘要跟 MySQL 分开：**Doris 完全放 `/`，绝不进 `/data`**（原因见 0.3）；
- 如果这是别人在用的 UAT 库/看板机，先跟负责人确认。
:::

### 0.1 一次性体检（8 条，全部粘贴执行）

```bash
echo "===== 1. CPU / 内存 ====="
nproc; free -g; grep -o 'avx2' /proc/cpuinfo | head -1
echo "===== 1b. 现有 MySQL / 看板占用 ====="
ps -eo rss,args | grep -E 'mysqld|dashboard' | grep -v grep | awk '{printf "%.1fG %s\n", $1/1048576, $2}'
du -sh /data/mysql_57; du -sh /opt/*dashboard 2>/dev/null
echo "===== 2. glibc ====="
ldd --version | head -1
echo "===== 3. 系统与安全 ====="
cat /etc/redhat-release; getenforce
systemctl is-active firewalld; systemctl is-active chronyd
echo "===== 4. 现有 Java ====="
java -version 2>&1 | head -3
echo "===== 5. 磁盘 ====="
df -h / /data
echo "===== 6. Doris 端口占用（期望无输出） ====="
ss -lntp | grep -E ':(8030|8040|9010|9020|9030|9050|9060|8060)\b'
echo "===== 7. 外网下载能力 ====="
curl -sI -m 8 https://apache-doris-releases.oss-accelerate.aliyuncs.com/apache-doris-4.0.8-bin-x64.tar.gz | head -1
curl -sI -m 8 https://corretto.aws/downloads/latest/amazon-corretto-17-x64-linux-jdk.tar.gz | head -1
echo "===== 8. 同机已有服务 ====="
ps -ef | grep -E 'java|nginx|python' | grep -v grep | head -10
```

**结果怎么读**：

| 输出 | 含义 | 动作 |
|---|---|---|
| `grep avx2` **有输出** | CPU 支持 AVX2 | 用 x64 标准包（本文默认） |
| `grep avx2` **无输出** | 不支持 AVX2 | 下载页改选 **x64 (no avx2)** 包，否则进程直接崩 |
| `glibc` 显示 `2.17` | CentOS 7 上限 | 照常做，但做好雷区 2 的心理准备 |
| `getenforce` = `Enforcing` | SELinux 开着 | 按 1.2 处理 |
| 第 1b 段 mysqld 占用 > 6 G | 内存本来就紧 | FE 降到 `-Xmx2g`、BE `mem_limit=25%`，或换机器 |
| 第 6 段有输出 | 端口被占 | **停下**，先确认是哪个服务，换端口或换机器 |
| 第 7 段两条都是 `HTTP/1.1 200` 或 `302` | 能直接下包 | 走在线流程 |
| 第 7 段超时/连不上 | 内网机器无外网 | 走 0.2 离线传包 |

### 0.2 如果机器不能上外网（内网常见）

在能上网的电脑上下这三个文件，用 WinSCP / Xftp / `scp` 传到 `/opt/doris/soft/`：

| 文件 | 大小 | 地址 |
|---|---|---|
| `apache-doris-4.0.8-bin-x64.tar.gz` | 3.8 GB | `https://apache-doris-releases.oss-accelerate.aliyuncs.com/apache-doris-4.0.8-bin-x64.tar.gz` |
| `apache-doris-4.0.8-bin-x64.tar.gz.sha512` | 164 B | 同上加 `.sha512` |
| `amazon-corretto-17-x64-linux-jdk.tar.gz` | 约 190 MB | `https://corretto.aws/downloads/latest/amazon-corretto-17-x64-linux-jdk.tar.gz` |

```bash
# 在目标机上（如果中间有跳板机）
scp apache-doris-4.0.8-bin-x64.tar.gz doris@<跳板机>:/opt/doris/soft/
```

### 0.3 和 MySQL / 3 个看板共存的目录方案（重要）

**结论：Doris 全部放 `/opt/doris`（根分区），一个字节都不放 `/data`。**

| 目录 | 放什么 | 为什么放这 |
|---|---|---|
| `/opt/doris/soft/` | 安装包（3.8 G，装完删） | 根分区有 41 G，装完即删 |
| `/opt/doris/apache-doris-4.0.8-bin-x64/` | 程序（fe/be） | 与看板同级但不冲突，升级只换这个目录 |
| `/opt/doris/meta/` | FE 元数据 | 与 BE 数据分目录，方便单独备份 |
| `/opt/doris/storage/` | BE 数据（**上限 15 G**） | 与 MySQL 分属不同挂载点 |

**为什么不能放 `/data`**（这台机器最关键的一条）：

1. `/data` 现在 58 GB 是 MySQL 的数据，而且还会继续长；
2. BE 的磁盘水位是**按整个挂载点算的**——`/data` 被 MySQL 涨到 85%，Doris 会先停止写入和均衡（它看的是分区，不是你那个目录）；
3. `xtrabackup` 全量备份也会临时吃空间，那一刻 `/data` 的峰值不可控，背锅的是 Doris。

放在 `/` 上，`/data` 怎么涨都影响不到 Doris；代价是根分区要留余量，所以 BE 数据必须人为限在 15 G 以内。

**空间预算（根分区 41 G 可用）**：

| 项 | 占用 | 说明 |
|---|---|---|
| 安装包 | 3.8 G | 解压校验完就 `rm` |
| 程序解压后 | 约 2 G | fe + be |
| FE 元数据 | 1–2 G | |
| BE 数据 | **≤ 15 G** | 建表时按需 `drop` |
| FE/BE 日志 | 1–2 G | 定期清理 `log/` |
| 合计 | 约 22 G | 留 19 G 给系统和 3 个看板 |

---

## 1. 系统准备（这台机器专属）

### 1.1 先修 yum 源（CentOS 7 已 EOL，不修后面什么都装不上）

`yum install` 报 404 / `Could not resolve host: mirrorlist.centos.org` 就是这个原因。

```bash
mkdir -p /etc/yum.repos.d/bak
mv /etc/yum.repos.d/CentOS-*.repo /etc/yum.repos.d/bak/ 2>/dev/null
curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
yum clean all && yum makecache
```

**期望结果**：`yum makecache` 最后出现 `Metadata Cache Created`。

::: tip 如果阿里云源也不通（改成官方归档源）

```bash
cp /etc/yum.repos.d/bak/CentOS-Base.repo /etc/yum.repos.d/
sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-Base.repo
sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-Base.repo
yum clean all && yum makecache
```

:::

### 1.2 关 SELinux 与防火墙（测试机）

```bash
setenforce 0
sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
systemctl stop firewalld && systemctl disable firewalld
getenforce        # 期望：Permissive
```

**为什么这台机必须关 SELinux**：CentOS 7 默认 `Enforcing`，BE 读写 `/opt/doris/storage` 会被拦，表现为"进程起了但 Alive=false，日志里没明显错误"——这是这台机器最隐蔽的雷。

### 1.3 内核与句柄（一次执行完）

```bash
swapoff -a
sed -ri 's/^([^#].*\sswap\s.*)$/#\1/' /etc/fstab
echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
echo madvise > /sys/kernel/mm/transparent_hugepage/defrag
echo 'vm.max_map_count = 2000000' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_abort_on_overflow = 1' >> /etc/sysctl.conf
sysctl -p
echo '* soft nofile 1000000' >> /etc/security/limits.conf
echo '* hard nofile 1000000' >> /etc/security/limits.conf
```

**验证（必须新开一个 SSH 会话再查）**：

```bash
free -h | grep Swap      # 期望：0
ulimit -n                # 期望：1000000，若还是 1024 就是没重登
cat /sys/kernel/mm/transparent_hugepage/enabled   # 期望：[madvise]
```

### 1.4 时间同步

```bash
systemctl enable --now chronyd
chronyc tracking | head -3      # 期望：Leap status : Normal
```

### 1.5 建 doris 用户与目录（全在 `/opt/doris`）

```bash
useradd -m -s /bin/bash doris
echo 'Doris@2026' | passwd --stdin doris
mkdir -p /opt/doris/soft /opt/doris/meta /opt/doris/storage
chown -R doris:doris /opt/doris
df -h / /data
```

**动手前再确认一遍**：`/opt/doris` 是新建目录，和三个看板平级但互不影响；**不要动 `mysql_57`，也不要往 `/data` 写任何 Doris 文件**。

---

## 2. 装 JDK 17（这台机器最容易卡的一步）

### 2.1 为什么不能 `yum install java-17-openjdk`

CentOS 7 的 yum 源里**最高只有 java-11**，`yum install java-17-openjdk` 会报 `No package available`。不要在上面反复折腾，直接用离线包。

### 2.2 用 Corretto 17（Amazon 官方，兼容 glibc 2.17）

```bash
cd /opt/doris/soft
curl -LO https://corretto.aws/downloads/latest/amazon-corretto-17-x64-linux-jdk.tar.gz
mkdir -p /usr/local/jdk17
tar -xzf amazon-corretto-17-x64-linux-jdk.tar.gz -C /usr/local/jdk17 --strip-components=1
/usr/local/jdk17/bin/java -version
```

**期望结果**：

```text
openjdk version "17.0.x" ...
OpenJDK Runtime Environment Corretto-17.0.x...
```

备选（Adoptium Temurin，效果一样）：

```bash
curl -L -o /opt/doris/soft/temurin17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
```

**记住这个路径**：`JAVA_HOME = /usr/local/jdk17`（两个配置文件都要写它）。

---

## 3. 下载、校验、解压 Doris

```bash
cd /opt/doris/soft
wget -c https://apache-doris-releases.oss-accelerate.aliyuncs.com/apache-doris-4.0.8-bin-x64.tar.gz
wget -c https://apache-doris-releases.oss-accelerate.aliyuncs.com/apache-doris-4.0.8-bin-x64.tar.gz.sha512

sha512sum apache-doris-4.0.8-bin-x64.tar.gz
cat apache-doris-4.0.8-bin-x64.tar.gz.sha512
```

**两个哈希必须一致**。下载中断就重跑同一条 `wget -c` 命令续传。

```bash
tar -xzf apache-doris-4.0.8-bin-x64.tar.gz -C /opt/doris
chown -R doris:doris /opt/doris
rm -f apache-doris-4.0.8-bin-x64.tar.gz    # 3.8 G，校验通过就删，根分区宝贵
ls /opt/doris/apache-doris-4.0.8-bin-x64     # 期望看到 fe  be
su - doris                                    # 切到 doris，后面都在这个身份下
```

::: tip 如果你这台的 CPU 不支持 AVX2
把上面所有文件名里的 `x64` 换成下载页给你的 **no avx2** 包文件名，其余命令不变。
:::

---

## 4. 部署 FE（参数已按本机填好）

### 4.1 改 `/opt/doris/apache-doris-4.0.8-bin-x64/fe/conf/fe.conf`

```properties
JAVA_HOME = /usr/local/jdk17
priority_networks = 192.168.16.0/24
meta_dir = /opt/doris/meta
lower_case_table_names = 1
JAVA_OPTS = -Xmx3072m -XX:+UseG1GC
```

::: warning 三个不能写错的地方
1. `priority_networks` 写 **`192.168.16.0/24`**，不是 `192.168.16.24/24`，也不是 `24.0`——要的是**网段**；
2. `JAVA_OPTS` 要在**原有那一行上改**，不要新增第二行（`fe.conf` 里本来就有这行，`grep -n JAVA_OPTS conf/fe.conf` 确认只剩一条）；
3. `-Xmx3072m` 是给这台 16 G 机器的值（MySQL 还要占 4–8 G），**别再往上加**。
:::

### 4.2 启动并验证

```bash
cd /opt/doris/apache-doris-4.0.8-bin-x64/fe
bin/start_fe.sh --daemon
sleep 5
ss -lntp | grep -E '9030|8030'
tail -n 30 log/fe.out
```

**期望**：9030、8030 都在监听；`fe.out` 里没有 `Exception`。

### 4.3 装客户端、连接、看状态

```bash
yum install -y mariadb        # 提供 mysql 命令
mysql -uroot -P9030 -h192.168.16.24
```

```sql
SHOW FRONTENDS\G
```

**期望**：`Alive: true`、`Join: true`、`IsMaster: true`、`Version: 4.0.8-...`。

**FE 起不来的三种典型**：

| 现象 | 处理 |
|---|---|
| `fe.out` 有 `Unsupported class file major version` | `JAVA_HOME` 指向了系统的 JDK 8，改回 `/usr/local/jdk17` |
| `fe.out` 有 `GLIBC_2.28 not found` | 见雷区 2 |
| 端口占用 | `ss -lntp \| grep 8030`，改 `http_port` 或 kill 占用者 |

---

## 5. 部署 BE

### 5.1 改 `/opt/doris/apache-doris-4.0.8-bin-x64/be/conf/be.conf`

```properties
JAVA_HOME = /usr/local/jdk17
priority_networks = 192.168.16.0/24
storage_root_path = /opt/doris/storage,medium:HDD
mem_limit = 30%
```

`mem_limit = 30%`（约 4.8 G）是这台 16 G 机器的关键：BE 默认按 80% 吃内存（约 12.8 G），加上 FE 3 G 和 MySQL，机器会被撑满，看板或 mysqld 会被 OOM 掉。

::: warning 数据目录上限要自己盯
`/opt/doris/storage` 放的是 BE 数据，**建议不超过 15 G**。BE 的磁盘水位看的是整个根分区（共 41 G 可用），根分区被日志或其他文件涨满时，Doris 自己也会停写。每周 `df -h /` 看一眼。
:::

### 5.2 注册 BE（在 FE 的 mysql 会话里）

```sql
ALTER SYSTEM ADD BACKEND "192.168.16.24:9050";
```

**期望**：`Query OK`。

### 5.3 启动 BE 并验证

```bash
cd /opt/doris/apache-doris-4.0.8-bin-x64/be
bin/start_be.sh --daemon
sleep 10
ss -lntp | grep -E '9050|9060|8040|8060'
curl http://192.168.16.24:8040/api/health      # 期望：OK
tail -n 30 log/be.out
```

```sql
SHOW BACKENDS\G
```

**期望**：`Alive: true`。

**Alive=false 时按这个顺序查**（这台机器命中率从高到低）：

1. `tail -100 log/be.log | grep -iE 'error|heartbeat|register'`；
2. `getenforce` 是否是 Enforcing（雷区 1）；
3. `be.conf` 的 `priority_networks` 是否是 `192.168.16.0/24`；
4. `ss -lntp | grep 9050` 看 BE 实际绑在哪个 IP；
5. 注册信息写错就 `ALTER SYSTEM DROP BACKEND "192.168.16.24:9050";` 再重新 ADD。

---

## 6. 验收（做到这里才算成功）

```sql
CREATE DATABASE demo;
USE demo;
CREATE TABLE t1 (k1 INT, k2 VARCHAR(20))
DISTRIBUTED BY HASH(k1) BUCKETS 1
PROPERTIES ("replication_num" = "1");

INSERT INTO t1 VALUES (1,'a'),(2,'b'),(3,'c');
SELECT * FROM t1;
SELECT version();
SET PASSWORD = PASSWORD('Doris@2026#Uat');
```

**为什么必须写 `replication_num = "1"`**：默认副本数是 3，你只有 1 个 BE，会直接报 `Failed to find enough host with storage medium and tag`。看到这个报错不是集群坏了。

**收工标准**：`SHOW FRONTENDS` 三项全 true + `SHOW BACKENDS` Alive=true + `demo.t1` 查出 3 行 + root 密码已改。

---

## 7. 这台机器的 12 个雷（按踩中概率排序）

| # | 雷 | 后果 | 规避 |
|---|---|---|---|
| 1 | **SELinux 是 Enforcing** | BE 起进程但 Alive=false，日志无线索 | 1.2 节 `setenforce 0` + 改配置文件 |
| 2 | **glibc 2.17 是 CentOS 7 的上限** | 若二进制要求更高，报 `GLIBC_2.28 not found` 直接起不来 | **绝对不要 yum/dnf 升级 glibc**（会导致 ls、cp 等全部失效，机器报废）。真报错就改用 Docker 或换 Ubuntu 22.04 机器 |
| 3 | **yum 里没有 JDK 17** | `No package java-17-openjdk available` | 按第 2 节用 Corretto/Temurin 压缩包 |
| 4 | **CentOS 7 已 EOL，yum 源 404** | 连 `yum install mariadb` 都失败 | 1.1 节先换阿里云/vault 源 |
| 5 | **8030/8040 被看板或其他服务占用** | FE/BE 起不来，`Address already in use` | 体检第 6 段先查；冲突就改端口（`http_port`/`webserver_port`） |
| 6 | **内存 16 G 被三家抢** | MySQL、看板、Doris 互相 OOM | FE `-Xmx3072m` + BE `mem_limit=30%`；起完看 `free -g` 确认还有 2 G 余量 |
| 7 | **把 Doris 数据放 `/data`（与 MySQL 同分区）** | MySQL 涨到 85%，Doris 先停写、停均衡；备份峰值时更危险 | 全部放 `/opt/doris`，数据目录限 15 G（见 0.3） |
| 7b | **动了 `/data/mysql_57`** | MySQL 直接挂，UAT 库没得救 | 只读不写；不要把 Doris 的 `storage_root_path` 指到任何 `mysql` 相关目录 |
| 8 | **`priority_networks` 写成 IP 而不是网段** | BE 永远注册不上 | 写 `192.168.16.0/24` |
| 9 | **建表忘写副本数 1** | `Failed to find enough host` | 所有建表语句加 `PROPERTIES("replication_num"="1")` |
| 10 | **用 root 跑 Doris** | 文件权限锁死，升级/迁移时各种 Permission denied | 建 `doris` 用户，`chown -R doris:doris` |
| 11 | **`ulimit -n` 不生效** | 表一多就 `Too many open files` | 必须**重新登录**再 `ulimit -n` 验证 1000000 |
| 12 | **当生产环境用** | 单机单副本、无高可用，机器挂=数据没了 | 这台只做学习验证；生产至少 3 BE + 3 FE，数据盘 SSD、独立机器 |

---

## 8. 试完想清干净（别污染这台 UAT 机器）

```bash
# 1) 先停服务
/opt/doris/apache-doris-4.0.8-bin-x64/be/bin/stop_be.sh
/opt/doris/apache-doris-4.0.8-bin-x64/fe/bin/stop_fe.sh

# 2) 再从 FE 元数据里摘掉节点（如果 FE 还能连）
mysql -uroot -P9030 -h127.0.0.1 -p -e 'ALTER SYSTEM DROP BACKEND "192.168.16.24:9050";'

# 3) 删目录与用户
rm -rf /opt/doris
userdel -r doris
```

::: warning 保留 JDK 与系统参数
`/usr/local/jdk17`、`/etc/security/limits.conf`、`sysctl.conf` 这些改动**不要回滚**——它们不影响看板，回滚反而容易出错。SELinux 如果想恢复，把 `SELINUX=permissive` 改回 `enforcing` 再重启即可。
:::

---

## 9. 做完记下来

往 [学习笔记](/doris/02-部署与变更/01-学习笔记) 追加一段：

```markdown
## 2026-11-XX · 本机首次部署 4.0.8（192.168.16.24，CentOS 7.9）

- 配置：1FE+1BE 同机；FE -Xmx3G；BE mem_limit 30%；全部在 /opt/doris（不入 /data）
- 同机共存：MySQL 5.7（/data/mysql_57）+ 3 个看板 + xtrabackup
- JDK：Corretto 17（yum 无 java-17，用压缩包）
- 踩坑：<SELinux / 端口 / 副本数 / 其他>
- 验证：frontends 三项 true；backends Alive=true；demo.t1 3 行
- 结论：能跑通实验；受限于根分区 41G 与 16G 内存，不放业务数据
```
