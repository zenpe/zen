+++
title = 'Post 1'
date = 2023-01-15T09:00:00-07:00
draft = false
tags = ['red']
categories = ['生活随笔']
+++

当您想从**集群外部**（例如您的个人电脑）使用 `kubectl` 或者 API 直接访问 K3s API Server 的**公网 IP** 时，就必须将这个公网 IP 添加到 K3s 的 TLS 证书中。

否则，您会遇到一个经典的 `x509` 证书错误，提示“证书对 <IP地址> 无效”，因为默认证书中只包含了节点的内网 IP、主机名和 `127.0.0.1` 等。

下面我将为您提供两种核心方案：**安装时配置（推荐）** 和 **安装后修改（需要格外小心）**。

---

### 方案一：在安装 K3s 时添加（最佳实践）

这是最简单、最干净、也是官方推荐的方法。在运行 K3s 安装脚本时，通过 `--tls-san` 参数来额外指定一个或多个 IP 或域名。

**操作步骤：**

假设您的服务器公网 IP是 `74.226.88.58`。

使用官方安装脚本时，可以这样执行：

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--tls-san 74.226.88.58" sh -s -
```

**命令解析：**

*   `INSTALL_K3S_EXEC="..."`: 这是向 K3s 安装脚本传递参数的标准方式。
*   `--tls-san 123.123.123.123`:  `tls-san` 的意思是 "TLS Subject Alternative Name"。这个参数告诉 K3s 在生成 API Server 的主证书时，除了默认的地址外，再把 `123.123.123.123` 这个 IP 地址也包含进去。

如果您有多个 IP 或域名，可以用逗号分隔或多次使用该参数：

```bash
# 添加一个 IP 和一个域名
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--tls-san 123.123.123.123 --tls-san k3s.yourdomain.com" sh -s -
```

**优点：**
*   一次性操作，简单明了。
*   无风险，符合官方流程。

---

### 方案二：在已安装的 K3s 集群上修改

如果您已经安装并运行了 K3s，这个过程会复杂一些，因为它涉及到重新生成证书。

**！！！重要警告！！！**
**操作前请务必备份您的 K3s 数据，尤其是 `/var/lib/rancher/k3s` 目录。虽然这个过程通常是安全的，但误操作可能导致集群无法启动。**
`sudo cp -r /var/lib/rancher/k3s /var/lib/rancher/k3s.bak`

**操作步骤：**

这个方法的核心是：**删除旧证书，然后修改 K3s 的启动配置，让 K3s 在下次启动时用新的配置重新生成证书。**

**1. 停止 K3s 服务**

必须先停止 K3s，才能安全地修改文件。

```bash
sudo systemctl stop k3s
```
*(如果是 agent 节点，则为 `systemctl stop k3s-agent`)*

**2. （可选但建议）创建或修改 K3s 配置文件**

K3s 的启动参数可以通过一个 YAML 配置文件来管理，这比直接修改 systemd 服务文件要好。配置文件位于 `/etc/rancher/k3s/config.yaml`。

如果这个文件不存在，请创建它。然后添加 `tls-san` 配置。

```bash
# 使用 echo 和 tee 命令可以安全地创建或追加内容
# 将 123.123.123.123 替换成您的公网 IP
echo "tls-san:
  - \"74.226.88.58\"" | sudo tee /etc/rancher/k3s/config.yaml
```
*注意：`tls-san` 是一个列表，所以使用 `-`。如果文件已有内容，这个命令会覆盖它。如果想追加，请使用 `tee -a`。*

**3. 删除旧的动态证书**

K3s 会在发现证书不存在时自动重新生成。我们需要删除由 K3s 动态生成的证书文件。

```bash
sudo rm -rf /var/lib/rancher/k3s/server/tls/
```

**4. 重新启动 K3s**

现在启动 K3s。在启动过程中，它会读取 `/etc/rancher/k3s/config.yaml` 的配置，并根据新的 `tls-san` 设置重新生成证书。

```bash
sudo systemctl start k3s
```

启动可能需要一两分钟，因为它在执行初始化过程。您可以用 `journalctl -u k3s -f` 来观察启动日志。

---

### 如何验证是否成功

无论您使用哪种方案，验证方法都是一样的。

**1. 更新您的 kubeconfig 文件**

首先，您需要一个用于外部访问的 `kubeconfig` 文件。您可以从服务器的 `/etc/rancher/k3s/k3s.yaml` 复制内容。

然后，**手动修改**这个文件中的 `server` 地址，将 `127.0.0.1` 或内网地址改成您的公网 IP。

```yaml
# 您的 kubeconfig 文件片段
...
clusters:
- cluster:
    certificate-authority-data: ...
    # 将下面的地址改成您的公网 IP
    server: https://123.123.123.123:6443
  name: default