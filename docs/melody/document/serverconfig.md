# 服务设置

在 _Melody_ 上使用TLS有两种不同的策略：

- 将TLS用于HTTPS和HTTP/2
- 在 _Melody_ 前面使用带有TLS终端的平衡器（例如 ELB、HAproxy）

如果您想要在 _Melody_ 中启用TLS，在需要在服务级别（根级别）去配置`tls`属性，并且至少包含公钥和私钥。添加 TLS时，_Melody_ 只是去使用TLS进行侦听，并且不会接受纯HTTP的流量

## TLS简单配置

使用TLS来启动 _Melody_ 您只需要生成证书并提供公钥和私钥：
```json
{
	"version": 1,
	"tls": {
		"public_key": "/path/cert.pem",
		"private_key": "/path/key.pem"
	}
}
```

## TLS完整配置

必填选项：

- `public_key` ： 公钥或相对于当前工作目录的绝对路径
- `private_key`： 私钥或相对于当前工作目录的绝对路径

可选选项:

- `disable`： 布尔值，禁用TLS的临时表示，用于开发阶段
- `min_version`： 字符串，最低TLS版本（SSL3.0、TLS10、TLS11、TLS12）
- `max_version`： 字符串，最大TLS版本（SSL3.0、TLS10、TLS11、TLS12）
- `curve_preferences`： 整数数组，曲线首选项的所有标识符的列表
- `prefer_server_cipher_suites`： 布尔值，强制使用服务器提供的密码套件之一，而不是使用客户端提出的密码套件
- `cipher_suites`： 整数数组，密码套件列表，列表以及值对应的列表如下所示：

  - `5`: TLS_RSA_WITH_RC4_128_SHA
  - `10`: TLS_RSA_WITH_3DES_EDE_CBC_SHA
  - `47`: TLS_RSA_WITH_AES_128_CBC_SHA
  - `53`: TLS_RSA_WITH_AES_256_CBC_SHA
  - `60`: TLS_RSA_WITH_AES_128_CBC_SHA256
  - `156`: TLS_RSA_WITH_AES_128_GCM_SHA256
  - `157`: TLS_RSA_WITH_AES_256_GCM_SHA384
  - `49159`: TLS_ECDHE_ECDSA_WITH_RC4_128_SHA
  - `49161`: TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA
  - `49162`: TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA
  - `49169`: TLS_ECDHE_RSA_WITH_RC4_128_SHA
  - `49170`: TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA
  - `49171`: TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA
  - `49172`: TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA
  - `49187`: TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256
  - `49191`: TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256
  - `49199`: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  - `49195`: TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
  - `49200`: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
  - `49196`: TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
  - `52392`: TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
  - `52393`: TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305