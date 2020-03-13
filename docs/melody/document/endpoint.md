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
- `querystring_params`：[查询参数](#可选查询参数)
- `headers_to_pass`：[请求头转发](#请求头转发)
- `concurrent_calls`：[并发请求](#并发请求)

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

- [黑名单](./backend.html#黑名单)
- [白名单](./backend.html#白名单)

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
			"endpoint": "product",
			"method": "GET",
			"concurrent_calls": 3,
			"backends": [
				{
					"url_pattern": "/foo",
					"host": [
						"https:api.melody.com:8000",
						"https:api.melody.com:8001"
					]
				}
			]
		}
	]
}
```

上面的实例中，当用户调用`/products`节点时，*Melody*打开三个与后端的连接，并且返回最快成功的响应

### `concurrent_calls`应该设为多少？

这个数字取决与服务的行为方式以及每种服务所拥有的的资源数量

不过我们建议你使用`3`，因为3可以提供优异的结果，并且不需要增加您的资源

### 工作效率如何？

*Melody*最多向您的后端发送N个请求，收到第一个成功的响应后，*Melody*取消其余的所有请求，并且忽略之前的任何失败，仅在N个请求都失败的情况下，该节点请求才认为失败


## 参数转发

数据转发的默认策略如下：
- 查询参数将不会被代理到后端
- 请求头将不会被代理到后端
- Cookie将不会被代理到后端

您可以根据自己的需要去更改配置，并定义通过哪些元素

### 可选查询参数

默认情况下*Melody*不会讲任何查询字符串参数发送到后端，意味着，如果你只是简单配置了节点`/test?a=1&b=2`，没有其他的配置，节点下的所有后端都不会看到`a`或`b`

可以通过在节点层级的`querystring_params`的配置，去声明你允许转发到后端的查询参数，该配置行为类似白名单：将`querystring_params`中的所有匹配的参数转发到后端，其余的参数丢弃。

查询参数始终是可选的，您可以传递它们的子集、全部或不传

例如，我们让参数`a`和`b`转发到后端
```json
{
	"version": 1,
	"port": 8000,
	"endpoints": [
		{
			"endpoint": "/test",
			"querystring_params": [
				"a",
				"b"
			],
			"backends": [
				{
					"url_pattern": "/t",
					"host": [
						"https://api.melody.com"
					]
				}
			]
		}
	]
}
```

使用此配置去启动*Melody*，发送请求`:8000/test?a=1&b=2&c=3`，后端将接受`a`和`b`，`c`将会被丢弃

当然你可以配置放行所有查询参数，通过如下配置
```json
"querystring_params": [
	"*"
]
```
但是启用通配符可能会污染你的后端，因为最终用户或恶意攻击这发送的任何查询字符串都会通过网关并影响后面的的后端，我们的建议是让网关知道API定义中的查询字符串，并在列表中指定它们，即使列表很长，也不要使用通配符，一旦决定使用，请确保您的后端可以出来来自客户端的恶意参数。

### 强制查询参数

当您的后端需要查询字符串参数，并且它们在*Melody*或后端是必需的，可以通过在节点的URI上使用`{variables}`占位符，变量可以作为查询字符串参数的一部分注入后端，例如：
```json
{
	"endpoint": "/test/{name}",
	"backends": [
		{
			"url_pattern": "/t?name={name}",
			"host": [
				"https://api.melody.com"
			]
		}
	]
}
```
参数`name`是强制的，如果不提供的话，*Melody*会作出404的响应

### 请求头转发

*Melody*默认不会将请求头转发到后端，可以通过`headers_to_pass`去配置请求头白名单

来自浏览器或移动客户端请求通常包含很多请求头，通常包括Host、Connection、Cache-Control、Cookie和很多很多。

*Melody*默认仅会将下面这些转发给后端
```json
Accept-Encoding: gzip
Host: localhost:8080
User-Agent: Melody Version 1.0.0
X-Forwarded-For: ::1
```
将客户端的`User-Agent`传到后端示例

```json
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/test",
			"headers_to_pass": [
				"User-Agent"
			],
			"backends": [
				{
					"url_pattern": "/t",
					"host": [
						"https://api.melody.com"
					]
				}
			]
		}
	]
}
```
上述配置会导致后端接受到的请求头为
```json
Accept-Encoding: gzip
Host: localhost:8080
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Safari/605.1.15
X-Forwarded-For: ::1
```

当然，你依旧可以通过配置通配符来放行所有的请求头
```json
"headers_to_pass": [
	"*"
]
```

### Cookie转发

如果你想让Cookie传递的内容到达后端，您可以这样配置
```json
"headers_to_pass": [
	"Cookie"
]
```

## 调试节点

当启动*Melody*的时候，加上参数`-d`可以开启Debug模式，该模式下，节点`/__debug`是可用的

该调试节点可以作为伪造的后端，对于查看网关和后端之间的交互非常有用，因为它的处理是使用`DEBUG`日志级别在日志中打印

在开发阶段，使用`/__debug`将*Melody*本身添加为另一个后端，这样您可以确切的看到后端接受的标题和查询字符串参数

使用调试节点可以为你省去很多麻烦，因为当不存在特定的请求头或参数时，您的应用程序可能无法正常工作，也许您依靠的是客户端发送的内容而不是网关发送的内容

例如，您的客户端可能正在发送`Content-Type`或`Accept`请求头，而这些请求头可能是后端正常运行所必需的，但是*Melody*默认不会放行这些请求头，通过调试节点，您可以轻松的重现调用和条件

### 调试节点配置示例

我们会测试以下节点:
- `/default`：没有转发客户端请求头、查询字符串或Cookie
- `/optional`：转发已经参数和请求头
	- `a`和`b`作为查询参数
	- `User-Agent`和`Accept`放行转发请求头
- `/mandatory/{variable}`：将variable作为参数变量

编写以下配置文件
```json
{
	"version": 1,
	"port": 8080,
	"host": ["https://127.0.0.1"],
	"endpoints": [
		{
			"endpoint": "/default",
			"backends": [
				{
					"url_pattern": "/__debug/default"
				}
			]
		},
		{
			"endpoint": "/optional",
			"querystring_params": [
				"a",
				"b"
			],
			"headers_to_pass": [
				"User-Agent",
				"Accept"
			],
			"backends": [
				{
					"url_pattern": "/__debug/optional"
				}
			]
		},
		{
			"endpoint": "/mandatory/{variable}",
			"backends": [
				{
					"url_pattern": "/__debug/mandatory/{variable}"
				}
			]
		}
	]
}
```

请求第一个接口`/default`
```bash
$ curl -i 'http://127.0.0.1:8080/default'
```
从log中可以看到，请求头中默认只有三个被转发到了后端
```bash
2020/03/07 09:13:54  DEBUG: Method: GET
2020/03/07 09:13:54  DEBUG: URL: /__debug/default
2020/03/07 09:13:54  DEBUG: Query: map[]
2020/03/07 09:13:54  DEBUG: Params: [{param /default}]
2020/03/07 09:13:54  DEBUG: Headers: map[Accept-Encoding:[gzip] User-Agent:[Melody Version 1.0.0] X-Forwarded-For:[127.0.0.1]]
```

请求第二个接口`/optional`
```bash
curl -i 'http://127.0.0.1:8080/optional?a=1&b=2'
```
可以明显看到在第二个请求中的配置生效，查询参数`a`和`b`都被放行，并且请求头中`User-Agent`变成了实际的值，`Accept`也被放行
```bash
2020/03/07 09:25:46  DEBUG: Method: GET
2020/03/07 09:25:46  DEBUG: URL: /__debug/optional?&a=1&b=2
2020/03/07 09:25:46  DEBUG: Query: map[a:[1] b:[2]]
2020/03/07 09:25:46  DEBUG: Params: [{param /optional}]
2020/03/07 09:25:46  DEBUG: Headers: map[Accept:[*/*] Accept-Encoding:[gzip] User-Agent:[curl/7.64.1] X-Forwarded-For:[127.0.0.1] X-Forwarded-Via:[Melody Version 1.0.0]]
```

请求第三个接口`/mandatory/{variable}`

```bash
curl -i `http://127.0.0.1:8080/mandatory/melody`
```
在后端的log中将URI参数`melody`参数转发到了后端
```bash
2020/03/07 09:29:16  DEBUG: Method: GET
2020/03/07 09:29:16  DEBUG: URL: /__debug/mandatory/melody
2020/03/07 09:29:16  DEBUG: Query: map[]
2020/03/07 09:29:16  DEBUG: Params: [{param /mandatory/melody}]
2020/03/07 09:29:16  DEBUG: Headers: map[Accept-Encoding:[gzip] User-Agent:[Melody Version 1.0.0] X-Forwarded-For:[127.0.0.1]]
```

## 节点安全

*Melody*目前已经实现了集中安全策略该策略在`melody-httpsecure`模块控制，要启用他们，您只需要在节点级别的`extra_config`中配置即可

像下面这样，就是一个完整的配置
```json
{
	"version": 1,
	"port": 8080,
	"endpoints": [
		{
			"endpoint": "/secure",
			"extra_config": {
				"melody_httpsecure": {
			    "allowed_hosts": [
			      "host.known.com:443"
			    ],
			    "ssl_proxy_headers": {
			      "X-Forwarded-Proto": "https"
			    },
			    "ssl_redirect": true,
			    "ssl_host": "ssl.host.domain",
			    "ssl_port": "443",
			    "ssl_certificate": "/path/to/cert",
			    "ssl_private_key": "/path/to/key",
			    "sts_seconds": 300,
			    "sts_include_subdomains": true,
			    "frame_deny": true,
			    "custom_frame_options_value": "ALLOW-FROM https://example.com",
			    "hpkp_public_key": "pin-sha256=\"base64==\"; max-age=expireTime [; includeSubDomains][; report-uri=\"reportURI\"]",
			    "content_type_nosniff": true,
			    "browser_xss_filter": true,
			    "content_security_policy": "default-src 'self';"
			  }
			}
		}
	]
}
```
该配置描述了很多的选项，详细请继续看下去

### 一般安全

#### 主机连接限制

通过`allowed_hosts`字段控制，该字段定义了*Melody*应该请求的主机白名单

当请求到达*Melody*时，它会去确认请求头中的`Host`是否在白名单之中，如果存在，*Melody*则会进一步去处理请求，如果不存在白名单之中，*Melody*则会拒绝该请求

在配置时，必须包括主机的标准域名以及端口号。当该字段为空时，默认可以请求任何主机

#### 点劫持保护

什么是[点劫持](https://github.com/granty1/melody/blob/master/docs/%E7%82%B9%E5%8A%AB%E6%8C%81%E4%BF%9D%E6%8A%A4.md)？

通过`frame_deny`来控制是否在`frame`中拒绝任何来源

当然你可以通过`custom_frame_options_value`去自定义哪些站点来源允许放到你的`frame`中

比如
```json
"custom_frame_options_value": "ALLOW-FROM https://example.com",
```
这样的配置表示当资源来自于`https://exmaple.com`站点时，不会被屏蔽掉。

更过请参阅[OWASP Clickjacking](https://owasp.org/www-project-cheat-sheets/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html#X-Frame-Options_Header_Types)

#### MIME嗅探防御

什么是[MIME嗅探](https://github.com/granty1/melody/blob/master/docs/MIME嗅探防御.md)?

可以通过`content_type_nosniff`来启用防御

启用了此功能将防止用户的浏览器将文件解释为HTTP响应头中`Content-Type`类型所声明的以外的内容

#### 跨站点脚本(XSS)防御

通过`browser_xss_filter`来开启防御

此功能主要是通过设置响应头中的`X-XSS-Protection`来启用用户浏览器中的[跨站点脚本(XSS)](https://owasp.org/www-community/attacks/xss/)筛选器

### HTTPS

#### HTTP严格传输安全(HSTS)

什么是[HSTS](https://github.com/granty1/melody/blob/master/docs/%E5%85%B3%E4%BA%8EHTTP%E4%B8%A5%E6%A0%BC%E4%BC%A0%E8%BE%93%E5%AE%89%E5%85%A8.md)？

通过`sts_seconds`控制

设置响应头中的`Strict-Transport-Security`字段，自定义最大使用期限来启用此策略，设置为`0`表示禁用HSTS

#### HTTP公钥固定(HPKP)

什么是[HTTP公钥固定](https://github.com/granty1/melody/blob/master/docs/HTTP%E5%85%AC%E9%92%A5%E5%9B%BA%E5%AE%9A.md)?

通过`hpkp_public_key`

### OAuth2

开发中。。。

## 泛化调用

*Melody*支持使用JSON及其他内容编码将响应消息返回客户端

### 支持的编码

*Melody*可以使用多种内容类型，甚至允许客户端选择如何编码内容，`output_encoding`可以为每个节点选择以下策略:
- `json` 节点始终以JSON格式返回响应
- `negotiate` 允许客户端通过解析`Accept`头进行选择，*Melody*可以返回：
	- `json`
	- `xml`
	- `rss`
	- `yaml`
- `string` 将整个响应以字符串返回给客户端
- `no-op` 不做任何操作，无编码、解码

每个节点都可以定义使用的编码策略，如下面配置所示，当`output_encoding`省略时，*Melody*会默认使用JSON
```json
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/a",
			"output_encoding": "negotiate",
			"backends": [
				{
					"url_pattern": "/a"
				}
			]
		},
		{
			"endpoint": "/b",
			"output_encoding": "string",
			"backends": [
				{
					"url_pattern": "/b"
				}
			]
		},
		{
			"endpoint": "/c",
			"backends": [
				{
					"url_pattern": "/c"
				}
			]
		}
	]
}
```

节点`/c`没有定义任何编码配置，默认将使用JSON

## 无操作代理

*Melody*中的`no-op`是一种特殊的编码类型，它将后端的响应原样返回给客户端

### 使用`no-op`代理

当你设置了`no-op`，*Melody*不会检察请求的body或以任何方式进行处理。*Melody*接收到设置了`no-op`的请求时，它会直接将其代理到后端，不会进行任何其他操作。

但是注意的是，不进行任何操作，也就是说不会有数据合并、过滤那些操作，所以此时的节点只能声明对应一个后端，多个则不会生效

但是从客户端到*Melody*这一段任然是可行的，所以速率限制或者要求JWT授权的一些策略依然生效

当然你需要知道`no-op`的作用是？
- *Melody*的节点像常规代理一样工作
- 路由部分的功能策略是可用的
- 某些功能被禁用，比如响应合并、过滤、操作、检察、并发等
- 放行的请求头你仍然需要去设置，因为这个是在路由层面做的，通过`header_to_passs`进行设置
- 后端的响应将不会做任何处理直接返回客户端
- 节点和后端必须是一对一关系

### 什么时候需要`no-op`

1. 当你想将一个后端返回的`Cookie`直接设置到客户端
1. 你需要维护后端响应的所有响应头

### 如何使用`no-op`

`no-op`可以设置在节点层级上，也可以设置在后端层级上

- 在节点层级，`"output_encoding": "no-op"`
- 在后端层级，`"encoding": "no-op"`

配置示例

```json {6}
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/url",
			"output_encoding": "no-op",
			"backends": [
				{
					"url_pattern": "/backend",
					"encoding": "no-op",
					"host": [
						"127.0.0.1"
					]
				}
			]
		}
	]
}
```


## 链式代理

![链式请求](/melody-docs/sequential_proxy.png)

有时候你的需求可能是从第一个请求的响应中拿数据再去进行第二个请求，或者延迟的后端调用，链式代理可以满足你的需求

### 使用链式代理

启用链式代理，只需要在配置文件的额外配置中声明即可
```json {9}
{
	"version": 1,
	"port": 8000,
	"endpoints": [
		{
		  "endpoint": "/findone/{name}",
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
			      "host": [
			        "127.0.0.1:8001"
			      ]
			    },
			    {
			      "url_pattern": "/role/{resp0_base_info.role_id}",
			      "encoding": "json",
			      "group": "role_info",
			      "host": [
			        "127.0.0.1:8001"
			      ]
			    }
			]
		}
	]
}
```

当启用了链式代理之后，你可以在第一个后端之外的后端配置上使用表达式`{respn_m.k}`
- `n`表示后端的下标，从0开始
- `m`表示响应中结构体的层级
- `k`表示具体取用哪个字段

### 示例

通过*Melody*启动上述配置文件，准备好两个后端`/user/{name}`和`/role/{id}`

执行
```bash
curl -i http://127.0.0.1:8000/findone/Grant
```

*Melody*会先去执行第一个请求
```bash
curl - i http://127.0.0.1:8001/user/Grant
```

得到的响应
```json
{
    "name": "Grant",
    "id": 1,
    "role_id": 1
}
```

由于配置了`group`，所以结果会被包装成
```json
{
	"base_info": {
	    "name": "Grant",
	    "id": 1,
	    "role_id": 1
	}
}
```

第二个后端配置回去解析`url_pattern`中的表达式`resp0_base_info.role_id`，表示第一个后端响应的`base_info`对象中的`role_id`字段，于是取到了`"role_id": 1`

然后再去请求第二个后端
```bash
curl -i http://127.0.0.1:8001/role/1
```
得到响应
```json
{
    "id": 1,
    "name": "Administrator"
}
```

第二个后端配置也声明了`group`，所以响应会被组装成
```json
{
	"role_info": {
		"id": 1,
    	"name": "Administrator"
	}
}
```

最终整个大的代理会将两次子代理的响应整合

```json
{
    "base_info": {
        "id": 1,
        "name": "Grant",
        "role_id": 1
    },
    "role_info": {
        "id": 1,
        "name": "Administrator"
    }
}
```

## 静态响应

静态响应是处理不完全或其他未知类型响应的一种策略。启用之后，后端的行为触发了配置的策略时，*Melody*会在最终响应中植入静态数据

经常遇到的问题就是，某个后端发生故障从而使得节点响应不完整，此时您可以使用静态数据来处理降级的响应

另外一个使用的场景就是某个节点尚未开发完成，并不能投入生产使用，但是客户端需要提供一个简单的数据模拟，这时候你也可以通过该功能去实现

### 静态响应策略

- `always` 无论在什么时候都会讲静态数据植入响应
- `success` 只有在所有后端响都未失败的情况下才会植入静态数据
- `complete` 只有在所有后端都作出响应并且没有任何错误的情况下才会植入静态数据
- `errored` 在某个后端响应错误的时候植入静态数据
- `incompleted` 在后端响应不完整时，会植入静态数据

相关的代码可以在[github](https://github.com/granty1/melody/blob/e28b61e54e33205d541b290cd2fbc24bcb602fa7/proxy/static.go#L100)上找到

### 冲突处理

在所有后端的响应合并之后，才会去处理静态的数据植入，但是此时要注意静态数据中是否有键与合并之后的响应中有冲突，否则后端响应中的键对应的值将会被静态数据覆盖

### 配置静态响应

在任何一个节点配置层级都可以进行静态响应的配置，配置如下
```json
{
	"version": 1,
	"endpoints": [
		{
			"endpoint": "/test",
			"backends": [
				{
					"url_pattern": "/backend",
					"host": [
						"127.0.0"
					]
				}
			],
			"extra_config": {
				"melody_proxy": {
					"static": {
						"strategy": "errored",
						"data": {
							// static data
						}
					}
				}
			}
		}
	]
}
```

