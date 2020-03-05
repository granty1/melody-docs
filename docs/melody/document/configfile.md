# 配置文件

_Melody_ 服务器需要启动和操作的所有配置都是一个配置文件。在所有文档中，此文件都称为`melody.json`。

但是`melody.json`只是一个别名，你可以使用任何名字，比如`example.json`，只是在使用的是要注意修改为：
```shell
melody run -c example.json -d
```
::: warning 注意
如果配置文件太大或重复，可以使用模板系统将其拆分为多个文件。有关此功能将会在后面的版本推出，这个功能还在进行开发。
:::

## 生成配置

配置文件可以从头开始编写，也可以重用另一个现有文件作为基础，但编写第一个配置文件的最简单方法是使用在线配置编辑器 _Melody Designer_ 。

_Melody Designer_ 是一个简单的javascript应用程序，它帮助您了解API网关的功能，并帮助您为所有不同的选项设置不同的值。使用此选项不需要从头学习和编写所有属性名。可以随时下载配置文件并重新加载以继续编辑。

_Melody Designer_ 是一个纯静态页面，它不会将您的任何配置发送到其他地方，正如我们所有的软件一样，它也是开源的，您可以下载它并在自己的web服务器上运行它。请参阅Krakendesigner存储库。

立即[生成配置](https://github.com/granty1/melody)

## 验证配置

`melody check`命令验证配置文件的语法：
```shell
melody check -c melody.json

> Syntax OK!
```

当语法正确时，您将看到消息语法OK！，否则显示错误。

您还可以直接启动服务，因为这是在服务器启动之前完成的。

## 了解配置

所有的配置都在`melody.json`中进行，所以你得去熟悉他的内容和语法

### 整体结构

这个文件中有很多选项，现在我们只关注结构：
```json
{
    "version": 2,
    "endpoints": [...]
    "extra_config": {...}
    ...
}
```

- `version`: 代表当前使用的 _Melody_ 的版本，目前使用的是 `1`
- `endpoints`: 网关提供的端点对象数组以及所有相关的后端和配置，代表客户端到网关这一段。
- `extra_config`: 与中间件或组件相关的额外配置。例如，您可能希望启用日志记录或度量，这是API网关的非核心和可选功能。

### *endoint*

在 endpoint 中，对于每个端点，您都至少要声明一个 backend

看起来像：

```json
{
	"endpoints": [
		{
			"endpoint": "/v1/test",
			"backends": [
				{
					"url_pattern": "/te",
					"host": [
						"https://my.api.com"
					]
				},
				{
					"url_pattern": "/st",
					"host": [
						"https://my.api.com"
					]
				}

			]
		}
	]
}
```

上面的配置声明了 Endpoint: `/v1/test`, 并且合并了 Backends: `/te` 和 `st`

### *extra_config*

注册Endpoint 之后，_Melody_ 将从中获取额外配置（如果有的话）

extra_config 将出现在不同的层次，而这完全取决于每个组件。 文件根级别的 *extra_config* 通常设置整个服务级别的配置，它能影响到整个 _Melody_ ， 另外一些组件会在 Endpoint 、Bancked 级别去寻找关键字，此时这些额外的配置是用于限制单个的 Endpoint 或 Backend， 例如，您可能指向限制某个Endpoint下的某个Backend

每个外部的组件都有一个 **命名空间** ，该命名空间用于在初始化阶段去检索您是否启用该组件，例如，go-loggin中间件希望找到一个命名空间`melody_gologging`
```json
{
	"version": 1,
	"extra_config": {
		"melody_gologging": {
			"level": "DEBUG",
			"prefix": "[MELODY]",
			"syslog": false,
			"stdout": true
		}
	}
}
```

## 支持格式

默认情况下是`json`， 但实际上以下扩展名之一，_Melody_ 都是能解析的
- `.json`
- `.toml`
- `.yaml`
- `.yml`
- `.properties`
- `.props`
- `.prop`
- `.hcl`

不过最好的建议还是`json`，这样可以使用`melody check`去验证配置文件是否合法



