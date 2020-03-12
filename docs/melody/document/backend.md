# 后端(Backend)

## 概述

后端是指真正的服务器所暴露出来的接口，它提供了节点所需要的数据。

后端可以是任何服务器。只要*Melody*能访问到他，比如，您可以创建从内部服务器获取数据的端点，并通过外部API（例如GitHub,Facebool或其他服务）添加第三方数据来丰富节点

后端的配置在每个节点的`backends`属性中声明

### 举个栗子

下面的配置中，*Melody*提供了一个节点`/v1/user`，当你请求该节点时，第二个后端配置毫无疑问，*Melody*会帮你做出代理请求`"http://api-01.com/roles"`，但在第一个后端配置中提供了多个`host`，*Melody*则会帮你做负载均衡，每次选择最优的主机去代理请求。
```json
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/v1/name",
			"method": "GET",
			"backends": [
				{
					"url_pattern": "/name",
					"host": [
						"http://api-01.com",
						"http://api-02.com"
					]
				},
				{
					"url_pattern": "/roles",
					"host": [
						"http://api-01.com"
					]
				}
			]
		}
	]
}
```

## 数据处理

### 数据过滤

配置*Melody*节点时，您可以决定仅显示来自后端响应的字段子集，或更改返回的响应内容的结构，这个功能强烈推荐使用它来节省带宽

您可以使用以下两种策略来过滤内容：
- 黑名单
- 白名单

#### 黑名单

配置了黑名单之后，*Melody*将从响应中删除列表中定义的所有匹配的字段，并将返回不匹配的字段。通过黑名单，可以排除响应中的某些字段。

黑名单的配置非常简单，只需要在`banckend`层级下配置`blacklist`数组即可，例如：
```json
{
	"endpoint": "/v1/user",
	"backends": [
		{
			"url_pattern": "/back",
			"blacklist": [
				"token",
				"password"
			],
			"host": [
				"http://api.com"
			]
		}
	]
}
```
上述配置将会过滤掉`token`和`password`两个字段

并且注意**在配置`blacklist`时，不需要考虑到分组`group`**

但是**需要考虑到是否配置了目标`target`，如果配置了目标`target`，则需要注意黑名单中配置的字段应该以`target`为根级别**

#### 白名单

配置了白名单之后，*Melody*仅会返回响应体中与白名单中匹配的字段和对应值，使用白名单将严格定义响应的内容。示例：
```json
{
	"endpoint": "/v1/user",
	"backends": [
		{
			"url_pattern": "/back",
			"whitelist": [
				"name",
				"id"
			],
			"host": [
				"http://api.com"
			]
		}
	]
}
```
上述配置将只会返回响应中的`name`和`id`字段

白名单依然支持点字符

#### 嵌套字符

当然如果你想过滤的字段并不是在最外层的结构中，他有可能被其他结构包裹，这时候你可以通过点运算符`.`去分割
```json
{
	"name": "Grant",
	"age": 23,
	"role": {
		"name": "admin",
		"uuid": "xxxxx"
	}
}
```
例如上述结构，你可以通过`role.uuid`过滤该字段
::: warning 注意
但是上述的点操作符只支持对象模式，如果有数组或集合结构，这种点操作符将不支持，你可以通过数组操作去处理
:::

#### 使用白名单还是黑名单？

白名单和黑名单这两种操作不能并存，只能二选一，如果两者都配置，

从性能角度来看，黑名单的速度优于白名单


### 分组(group)

*Melody*能将您的后端响应分组到不同的对象内，换句话说，当你为后端设置了`group`属性后，*Melody*不会将所有后端的请求直接合并到一起，而是会新建一个以`group`命名的对象，然后将该后端的响应填入该结构体，然后再将所有后端响应进行合并。

当不同的厚度按相应可能具有冲突的键名时，比如两个后端响应同时包含`id`字段，这是你可以通过分别为这两个后端响应设置分组来解决这个冲突

:::warning 注意
对同一个节点下不同的后端设置分组时，不要设置相同的分组名，不然只会导致分组冲突，最终数据被覆盖。
:::

#### 分组示例

以下配置的是一个节点，该节点从两个不同的后端获取数据，但其中一个响应封装在分组`last_post`中
```json {17}
{
	"version": 1,
	"port": 8000,
	"endpoints": [
		{
	      "endpoint": "/findone/{name}",
	      "method": "GET",
	      "extra_config": {
	        "melody_proxy": {
	          "sequential": true
	        }
	      },
	      "output_encoding": "json",
	      "backends": [
	        {
	          "url_pattern": "/user/{name}",
	          "group": "base_info",
	          "method": "GET",
	          "blacklist": [
	            "id"
	          ],
	          "host": [
	            "http://api.com"
	          ]
	        },
	        {
	          "url_pattern": "/role/{resp0_base_info.role_id}",
	          "method": "GET",
	          "group": "role_info",
	          "host": [
	            "http://api.com"
	          ]
	        }
	      ]
	    }
	]
}
```
调用接口`/findone/{name}`

```bash
curl -i "http://localhost:8000/findone/Grant"
```
得到分组后的响应

```json
{
    "base_info": {
        "name": "Grant",
        "role_id": 1
    },
    "role_info": {
        "id": 1,
        "name": "Administrator"
    }
}
```

### 映射(mapping)

映射可以理解为重命名，可以更改后端响应的结构中的字段名，通过这个功能来适配不同的客户端而不需要更改后端代码

但是注意**映射在[目标提取](#目标提取)和[数据过滤](#数据过滤)之后，请确保映射的时候要映射的字段是否存在**

比如上述的响应中的`base_info.name`字段你并不想用`name`，而是想改为`user_name`，上面有提到只是在数据过滤和目标提取之后，但是在分组之前，所以不用去管他的上面是否还有一层分组
```json {3}
{
    "base_info": {
        "name": "Grant",
        "role_id": 1
    },
    "role_info": {
        "id": 1,
        "name": "Administrator"
    }
}
```
你只需要在`backend`层加上`mapping`配置
```json {5}
{
  "url_pattern": "/user/{name}",
  "group": "base_info",
  "method": "GET",
  "mapping": {
    "name": "user_name"
  },
  "blacklist": [
    "id"
  ],
  "host": [
    "http://api.com"
  ]
}
```
响应结果将会变成
```json
{
    "base_info": {
        "role_id": 1,
        "user_name": "Grant"
    },
    "role_info": {
        "id": 1,
        "name": "Administrator"
    }
}
```

### 目标提取

一般性在API中都会将数据封装在通用的结构中，例如`data`、`content`或者`response`，但是你并不希望每次都去获取子字段的数据，这时候你可以使用目标提取去获取你想要的字段，使之直接成为根级别的结构

注意，**目标提取发生在数据过滤发生在数据处理的最先阶段，发生在其他操作之前**

目标提取通过`target`属性来进行配置，该属性在`backend`层级

#### 目标提取示例

我们有这样的一个后端api：`/page`，返回的响应是一个JSON对象
```json
{
    "page": {
        "Name": "Page",
        "Url": "hello.com",
        "Title": "title"
    }
}
```

但是我现在不想要`page`这一层，我想拿到的结果直接是`Name`、`Url`、`Title`作为根级别。可以通过下面的配置实现
```json {8}
{
	"endpoints": [
		{
			"endpoint": "/newpage",
			"backends": [
				{
					"url_pattern": "/page",
					"target": "page",
					"host": [
						"http://api.com"
					]
				}
			]
		}
	]
}
```
再去访问api`/newpage`，得到响应
```json
{
    "Name": "Page",
    "Title": "title",
    "Url": "hello.com"
}
```

### 集合操作(collections)

当后端响应集合或数组时，这是一种特殊的操作情况，上述的部分操作可能无法达到你的预期，有两种情况：
- 当整个后端响应都是一个数组而不是对象，你可以尝试[包装数组](#包装数组)
- 当您想操作集合中的某个数据，比如类似`data.images[0].url`，可以参考[扁平集合](#扁平集合)

#### 包装数组

后端响应整个都在数组之内
```json
[
	{
		"a": 1
	},
	{
		"b": 2
	}
]
```
而前段想要拿到的是一个对象，应该包裹在`{}`之内，你可以通过声明`"is_collection": true`属性来实现如下效果，该属性是配置在`backend`层级的
```json
{
	"collection": [
		{
			"a": 1
		},
		{
			"b": 2
		}
	]
}
```

这个key值`collection`是*Melody*默认提供的，当然你可以结合映射(mapping)来更改，示例如下
```json
{
	"endpoint": "/list",
	"backends": [
		{
			"url_pattern": "/v1/list",
			"is_collection": true,
			"mapping": {
				"collection": "list"
			},
			"host": [
				"http://api.com"
			]
		}
	]
}
```
得到的响应结构将会变成这样
```json
{
	"list": [
		{
			"a": 1
		},
		{
			"b": 2
		}
	]
}
```

## 代理限速

无论客户端在节点级别生成多少请求流量，您都希望有效的控制*Melody*与后端的连接，后端的配置与节点层级的配置相似，但是声明在`backend`层级下

配置示例
```json {7}
{
	"endpoint": "/v1/{test}",
	"backends": [
		{
			"url_pattern": "/v1/{test}",
			"extra_config": {
				"melody_ratelimit_proxy": {
					"maxRate": 100,
					"capacity": 100
				}
			}
		}
	]
}
```
其中有两个参数你可以设置
- `maxRate` 此后端每秒接受的最大请求数
- `capacity` 在[令牌桶算法](https://github.com/granty1/melody/blob/master/docs/令牌桶算法.md)中有`bucket capacity == added per second`
 
### maxRate Vs clientMaxRate

maxRate(无论是在节点层还是后端(代理)层)是一个绝对值，您可以精确的控制允许到达后端或终结点的通信量。在DDoS中，maxRate由于无法接受超出允许范围的流量，因此可以有所帮助。

clientMaxRate是对每个客户端的限制，如果您只是想控制总流量，则它用不上，但是这样DDoS会完美的绕过节点层的流量限制，您可以通过设置clientMaxRate来将一些特定的滥用者限制在其限定的额度范围内。

## 断路器

为了保持*Melody*的响应能力，在后端代理的过程中添加了CircuitBreaker(断路器)中间件，通过此组件，当*Melody*要求的吞吐量超过实际的队长无法正常交付的吞吐量时，断路器机制将检测到故障并通过不发送可能会失败的请求来防止对服务器造成压力。通过防止由于超时等导致的失败请求过多，对于处理网络和其他通信问题也很有用。

[断路器模式](https://docs.microsoft.com/zh-cn/previous-versions/msp-n-p/dn589784\(v=pandp.10\)?redirectedfrom=MSDN)是通过简单的状态机来实现，监控该后端代理中的所有失败，当他们达到配置的阈值时，断路器将禁止代理更多的流量到后端。

### 怎样运行？

断路器通过一系列请求保留与您的后端的连接状态，并在开始时处于`close`状态，当它在给定的时间间隔(`interval`)内检测到的错误数达到了您所配置的连续故障数(`maxErrors`)，断路器将会停止该后端所有的代理进入`open`状态，即断开所有与后端所有的交互，进行下一个N秒(`timeout`)的等待，等待时间窗口后，断路器将进入到`half-open`状态，该状态下一旦检测到代理错误将立即回到`open`状态等待时间窗口，如果检测到代理成功，则断路器恢复到`close`状态

### 断路器的三种状态
![断路器](/melody-docs/circuitbreaker.png)
- `Close` 这是正常状态，当电路闭合时，电流不间断流动，并允许与服务器端连接交互
- `Half-Open` 当系统遇到重复的问题时，仅允许进行必要的连接以测试服务器
- `Open` 当电路段开时，不允许与服务器进行连接交互

### 断路器状态转换示意图
![断路器状态转换图](/melody-docs/circuitbreaker_status.png)

### 配置断路器

*Melody*将断路器作为中间件提供，您只需要在`backend`层的`extra_config`进行配置即可启用，具体配置如下所示
```json
{
	"endpoint": "/breaker",
	"backends": [
		{
			"url_pattern": "/b",
			"host": [
				"http://api.com"
			],
			"extra_config": {
				"melody_circuitbreaker": {
				    // 给定时间间隔(秒)
				    "interval": 60,
				    // 等待时间窗口(秒)
				    "timeout": 10,
				    // 连续故障数
				    "maxErrors": 1,
				    // 断路器状态改变时，是否log
				    "logStatusChange": true
				}
			}
		}
	]
}
```
