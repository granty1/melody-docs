# 节点(Endpoint)

## 创建节点

_Melody_ 节点是重要的组成部分，用户最终使用的其实就是这些节点。

可以先阅读[配置文件](./configfile/)

要创建节点，只需要在根级别的`endpoints`属性中添加节点对象，如果`method`没有声明，那么默认使用`GET`
```json
{
	"endpoints": [
		{
			"endpoint": "/v1/test",
			"method": "GET",
			"backends": [
				{
					"url_pattern": "/test",
					"method": "GET",
					"host": [
						"https://api.melody.com"
					]
				}
			]
		}
	]
}
```

上面的`json`配置了一个向客户端公开的接口`/v1/test`，并从后端`https://api.melody.com/test`获取数据，由于没有其他任何配置，所以只是起到代理然后将结果响应的作用，并不会对数据进行任何处理。

### 属性

节点中包含可配的属性
- `endpoint`：该节点公开的请求URI
- `method`：必须大写，`GET`、`POST`、`PUT`、`DELETE`
- `backends`：该节点对应的后端对象列表
- `extra_config`：该节点额外需要执行的组件或中间件配置
- `querystring_params`：[查询参数](##查询参数)
- `headers_to_pass`：[请求头转发](##请求头转发)
- `concurrent_calls`：[并发请求](##并发请求)

### 同种资源的多种请求方法

如果你希望一个节点同时监听`GET`和`POST`请求，你需要下面的配置
```json
{
	"endpoints": [
		{
			"endpoint": "/v1/test",
			"backends": [
				{
					"url_pattern": "/test",
					"method": "GET",
					"host": [
						"https://api.melody.com"
					]
				}
			]
		},
		{
			"endpoint": "/v1/test",
			"method": "POST",
			"backends": [
				{
					"url_pattern": "/test",
					"method": "POST",
					"host": [
						"https://api.melody.com"
					]
				}
			]
		}
	]
}
```

`method`属性在节点级别和`backend`级别都有声明，因为他们有可能不同

### 节点变量

你也可以在节点中使用变量，你可以使用大括号将变量名封装起来，比如`{name}`

```json {4}
{
	"endpoints": [
		{
			"endpoint": "/v1/user/{name}"
		}
	]
}

```

上面配置的节点将接受类似`/v1/user/Grant`或`/v1/user/G-a-n-t`获取他任何内容的请求，同时到不包含另一个`/`，比如`/v1/user/Grant/2`不会被该节点识别，对于这种情况您可能需要声明`/v1/user/{name}/{id}`

### 路由冲突

_Melody_ 的路由部分基于`httprouter`，具有很高的性能，但是您需要注意一下几点：
- 不能创建冲突的路由
- 由于路由仅具有明确的匹配项，因此您无法为同一路径端注册静态路由和变量，例如，您不能同时注册`/user/new`和`/user/{id}`在相同的请求方法下

如果出现上述冲突，_Melody_ 则会提示错误
```bash
panic: wildcard route ':id' conflicts with existing children in path '/user/:id'
```

### 其他限制

在配置文件中不应该出现`:name`这样的参数，目前 _Melody_ 对这种参数形势不支持

## 节点速率限制

限制节点速率是路由器的责任，它允许你设置每个节点*每秒*接受的*最大请求数*，默认情况下，节点可以处理的请求数没有限制

要指定速率限制，您需要在节点中中添加额外的配置

在节点这一级别，您可以根据以下内容设置节点的速率限制:
- `maxRate`：节点在一秒内接受的最大请求数
- `clientMaxRate`：节点对于每个*客户端*而言的最大请求数

### 如果`maxRate`达到限制怎么办？

如果API达到用户端点中的限制，则 _Melody_ 开始拒绝请求，客户端看到的HTTP状态码为`503 Service Unavailable`

### 客户端的节点速率限制(`clientMaxRate`)

该属性并不是去计算所有连向某个节点的连接，而是在每个客户端和节点之间维护一个计数器，每个 _Melody_ 实例都会为每个客户端在内存中保留其计数器
例如
```json
clientMaxRate: 10
```
允许200个不同的客户端（具有不同的IP）访问受限的*Melody*节点，产生以下的总流量
```
200 IPs × 10 (req/s) = 2000 (req/s)
```

::: warning 性能说明
限制每个用户的端点的时候，*Melody*使用了两个维度保留内存计数器： endpoints × clients

`clientMaxRate`会降低性能，因为每个传入的客户端都需要跟踪，即使计数器在数据中很小，也很容易创建几百万个计数器。
:::

在配置文件中没有`clientMaxRate`或者`clientMaxRate=0`将会没有任何限制

### 客户端识别策略

上述的`clientMaxRate`会根据客户端去做限制，那么如何去识别客户端呢？

有两种客户端识别策略：
- `"strategy": "ip"` ： 限制客户端IP时，每个IP将被视为不同的用户
- `"strategy: "header"`： 通过header来判断不同的用户，使用这种策略时，header的`key`必须存在
	- 例如，设置`"key": "X-TOKEN"`，可以使用`X-TOKEN`来作为唯一的用户标识符

### 如果`clientMaxRate`达到限制怎么办？

如果上述两种策略中的一个达到了设置的限制，那么*Melody*会开始拒绝请求，在客户端看到将是`429 Too Many Requests`

### 将`maxRate`和`clientMaxRate`一起使用

下面的实例演示了具有多个端点的配置，每个端点设置不同的限制
- `/first` 没有任何限制，因为配置了`maxRate`和`clientMaxRate`都是0
- `/second` 也是无限制的，因为没有配置相关属性
- `thrid`  上限为50req/s， 其他用户（不同的IP）最多可以达到5req/s
- `fourth` 每个用户（请求头中带有`X-TOKEN`）最多可以达到10req/s

配置
```json
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/first",
			"extra_config": {
				"melody_ratelimit_router": {
					"maxRate": 0,
					"clientMaxRate": 0
				}
			}
		},
		{
			"endpoint": "/second"
		},
		{
			"endpoint": "thrid",
			"extra_config": {
				"melody_ratelimit_router": {
					"maxRate": 50,
					"clientMaxRate": 5,
					"strategy": "ip"
				}
			}
		},
		{
			"endpoint": "thrid",
			"extra_config": {
				"melody_ratelimit_router": {
					"clientMaxRate": 10,
					"strategy": "header",
					"key": "X-TOKEN"
				}
			}
		}
	]
}
```

## 响应处理 

![response handle](/melody-docs/response.png)

*Melody*允许您直接对响应进行集中操作，只需要将它们添加到配置文件中即可，您也可以自己添加自己的或者第三方的中间件来扩展此行为。

默认情况下，一下的这些操作都是可用的

### 响应合并

创建*Melody*节点时，如果节点从两个或者更多后端原获取数据，客户端在调用该节点时，*Melody*会自动将多个后端数据进行合并，并且作为单个节点的响应。例如，你有三个不同的后端服务暴露出来的接口：`\a`、`\b`、`\c`，通过*Melody*你可以合并这三个后端节点的数据成一个对象，并且通过一个HTTP请求`/abc`访问到。

示例配置
```json
{
	"endpoints": [
		{
			"endpoint": "abc",
			"timeout": "800ms",
			"method": "GET",
			"backends": [
				{
					"url_pattern": "/a",
					"encoding": "json",
					"host": [
						"https://a.api.melody.com"
					]
				},
				{
					"url_pattern": "/b",
					"encoding": "xml",
					"host": [
						"https://b.api.melody.com"
					]
				},
				{
					"url_pattern": "/c",
					"encoding": "json",
					"host": [
						"https://c.api.melody.com"
					]
				}
			]
		}
	]
}
```

### 合并超时

注意，为了避免任何处理导致用户体验下降，在所有的后端决定响应之前，*Melody*不会永远被卡住，在网关中，**快速失败剩余缓慢成功**。*Melody*设有**应用超时策略**，这样使用户在高负载峰值、网络错误或任何使后端承受压力的其他问题期间安全可靠。

`timeout`的值可以配置在每个节点的内部，也可以设置在根级别，作为全局配置，单个节点的配置会覆盖全局配置。

#### 触发超时

如果*Melody*正在等待后端的响应并达到超时，则响应不会完整的返回，并且会丢失发生超时之前无法获取的任何数据。另一方面，在超时发生前可以有效检索的部分都将出现在响应体中。

如果响应缺少部分，那么将不会缓存响应头，因为我们不希望去缓存不完整的响应

在任何时候，*Melody*返回的响应头中都会包含一个key为`X-Melody-Complete`的布尔值，这个响应头将告诉你，你的响应是否完整

### 合并示例

现在你的服务端编写好了两个API：`127.0.0.1:8001/roles`和`127.0.0.1:8001/page`

请求`127.0.0.1:8001/roles`得到响应
```json
Content-Type: application/json; charset=utf-8
Date: Fri, 06 Mar 2020 05:13:04 GMT
Content-Length: 281

{
    "data": [
        {
            "ID": 0,
            "CreatedAt": "0001-01-01T00:00:00Z",
            "UpdatedAt": "0001-01-01T00:00:00Z",
            "DeletedAt": null,
            "roleId": "1",
            "roleName": "Administrator"
        },
        {
            "ID": 0,
            "CreatedAt": "0001-01-01T00:00:00Z",
            "UpdatedAt": "0001-01-01T00:00:00Z",
            "DeletedAt": null,
            "roleId": "2",
            "roleName": "Manual User"
        }
    ]
}
```

请求`127.0.0.1:8001/page`得到响应
```json
Content-Type: application/json; charset=utf-8
Date: Fri, 06 Mar 2020 04:58:57 GMT
Content-Length: 59

{
    "page": {
        "Name": "Page",
        "Url": "hello.com",
        "Title": "title"
    }
}
```

当你编写好了下面的配置
```json
{
  "version": 1,
  "extra_config": {},
  "port": 8000,
  "endpoints": [
    {
      "endpoint": "/roles_page",
      "output_encoding": "json",
      "backends": [
        {
          "url_pattern": "/roles",
          "host": [
            "127.0.0.1:8001"
          ]
        },
        {
          "url_pattern": "/page",
          "method": "GET",
          "host": [
            "127.0.0.1:8001"
          ]
        }
      ]
    }
  ]
}
```

启动*Melody*

请求`:8000/roles_page`，你可以得到如下响应
```json
Content-Type: application/json; charset=utf-8
X-Melody: Version 1.0.0
X-Melody-Complete: true
Date: Fri, 06 Mar 2020 05:10:49 GMT
Content-Length: 338

{
    "data": [
        {
            "CreatedAt": "0001-01-01T00:00:00Z",
            "DeletedAt": null,
            "ID": 0,
            "UpdatedAt": "0001-01-01T00:00:00Z",
            "roleId": "1",
            "roleName": "Administrator"
        },
        {
            "CreatedAt": "0001-01-01T00:00:00Z",
            "DeletedAt": null,
            "ID": 0,
            "UpdatedAt": "0001-01-01T00:00:00Z",
            "roleId": "2",
            "roleName": "Manual User"
        }
    ],
    "page": {
        "Name": "Page",
        "Title": "title",
        "Url": "hello.com"
    }
}
```

### 内容过滤

创建*Melody*节点时，您可以决定仅显示来自后端响应的部分字段，您可能有很多原因想要使用该功能，但是我们强烈建议你使用它来节省用户的带宽和负载，同时减少渲染时间

您可以使用一下两种策略来对内容进行过滤

- 黑名单
- 白名单

### 分组

*Melody*能够将您的后端响应分组到不同的对象内，换句话说，当您为backend设置`group`属性时，*Melody*不会将该backend的响应都放在响应的根级别上，而是创建一个新的对象，并将响应放在内部。

但是响应中可能存在键值的冲突，这时候，后被处理的数据将会覆盖前面的数据。

更多请查看映射文档

### 目标操作

在后端中一般性会有一层对象来对响应结果进行封装，比如`data`、`code`、`response`或者`content`之类，我们可以为客户端省去一层麻烦

可以通过设置`target`属性，来提取响应中您想留下的内容，但是该操作是在白名单/黑名单之前操作的，所以你要确保配置上的顺序的先后

更多请查看目标操作文档

### 集合或数组操作

*Melody*期望所有后端在响应中返回对象，但是偶尔会有后端的整个响应都在数组之内，这时候有需要对数组内对象的字段进行操作

*Melody*为你提供了简单的语法配置，通过配置，你可以随意的改变或者移除数组中某个元素的字段

更多请查看集合操作文档

## 并发请求

并发请求可以通过多次并行请求相同的信息来提高响应时间并降低错误率，当其中一个后端响应之后，其他的协程将被取消

使用并发请求时，后端服务必须能够处理其他负载，如果是这种情况，还需要要求你的后端请求是幂等的

可以通过`concurrent_calls`来配置
```json
{
	"endpoints": [
		{
			"endpoint": "product"
		}
	]
}
```