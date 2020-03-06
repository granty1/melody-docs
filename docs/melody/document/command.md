# 命令行

## Run

要启动 _Melody_ ，您需要通过`run`命令配合配置文件，还可以指定端口（默认为8080）

```shell
melody run -c melody.json
// 或者
melody run --config project/xxxx.json
// 或者
melody run --config project/xxxx.json -p 8080
```

如果你不提供任何的配置文件路径的话，_Melody_ 将会提醒您
```shell
melody run

> Please provide the path to your melody config file 
```

在解析时遇到的问题或者配置上存在问题，_Melody_ 都会明确的指出
```shell

melody run -c melody.json -d

> ERROR parsing the melody config file: 'melody.json': invalid character ':' after object key:value pair, offset: 4353, row: 186, col: 27
```

## Check 

`check`命令用来验证配置文件，因为在初始化运行初始化阶段，_Melody_ 并不会去做严格的解析，所以个别错别字可能会被覆盖掉，因此，在启动之前最好先通过`check`命令验证一下您的配置文件。

```
melody check -h

> 
......
......

Validates that the active configuration file has a valid syntax to run the service.
Change the configuration file by using the --config flag

Usage:
  melody check [flags]

Aliases:
  check, validate

Examples:
melody check -d -c config.json

Flags:
  -h, --help   help for check

Global Flags:
  -c, --config string   Path of the melody.json
  -d, --debug           Enable the Melody debug
```

正如你看到的，在`check`命令下， _Melody_ 支持全局两个参数选项:`-c`、`-d`和一个帮助参数:`-h`

### 举个栗子

使用配置文件
```json
{
  "version": 1,
  "extra_config": {
    "melody_http_server_handler": {
      "name": ["plugin_gologging"]
    },
    "melody_gologging": {
      "level": "DEBUG",
      "prefix": "[Grant]",
      "syslog": false,
      "stdout": true,
      "format": "default"
    }
  },
  "timeout": "3000ms",
  "cache_ttl": "300s",
  "output_encoding": "json",
  "port": 8000,
  "endpoints": [
    {
      "endpoint": "/get-person",
      "method": "POST",
      "extra_config": {
          "melody_jsonschema": {
            "type": "object",
            "properties": {
                "city": { "type": "string" },
                "number": { "type": "number" },
                "user": { 
                    "type": "object",
                    "properties": {
                        "name" : {"type": "string"},
                        "age" : {"type": "number"}
                    }                       
                }
            }
        }
      },
      "output_encoding": "json",
      "backends": [
        {
          "url_pattern": "/person",
          "encoding": "json",
          "extra_config": {

          },
          "method": "GET",
          "host": [
            "127.0.0.1:8080"
          ]
        },
        {
          "url_pattern": "/person/2",
          "encoding": "json",
          "extra_config": {
            "melody_proxy": {
              "shadow": true
            }
          },
          "method": "GET",
          "group": "aaa",
          "host": [
            "127.0.0.1:8080"
          ]
        }
      ]
    },
    {
      "endpoint": "/findone/{name}",
      "method": "GET",
      "extra_config": {
        "melody_proxy": {
          "sequential": true
        }
      },
      "output_encoding": "json",
      "concurrent_calls": 1,
      "backends": [
        {
          "url_pattern": "/user/{name}",
          "group": "base_info",
          "encoding": "json",
          "sd": "static",
          "extra_config": {},
          "method": "GET",
          "host": [
            "127.0.0.1:8001"
          ]
        },
        {
          "url_pattern": "/role/{resp0_base_info.role_id}",
          "encoding": "json",
          "sd": "static",
          "extra_config": {},
          "method": "GET",
          "group": "role_info",
          "host": [
            "127.0.0.1:8001"
          ]
        }
      ]
    },
    {
      "endpoint": "/static",
      "method": "GET",
      "extra_config": {
        "melody_proxy": {
          "sequential": true,
          "static": {
            "strategy": ["success"],
            "data": {
              "static": [
                {
                  "static1": 1
                },
                {
                  "static2": true
                },
                {
                  "static3": "hello"
                }
              ]
            }
          }

        }
      },
      "output_encoding": "json",
      "concurrent_calls": 1,
      "backends": [
        {
          "url_pattern": "roles",
          "encoding": "json",
          "sd": "static",
          "extra_config": {
            "melody_proxy": {
              "flatmap_filter": [
                {
                  "type": "move",
                  "args": [
                    "data.0.ID",
                    "data.0.role_id"
                  ]
                },
                {
                  "type": "move",
                  "args": [
                    "data.0.CreatedAt",
                    "data.0.create_at"
                  ]
                },
                {
                  "type": "del",
                  "args": [
                    "data.1.roleName"
                  ]
                }
              ]
            }
          },
          "group": "roles",
          "method": "GET",
          "host": [
            "127.0.0.1:8001"
          ]
        },
        {
          "url_pattern": "/role/static",
          "encoding": "json",
          "sd": "static",
          "extra_config": {},
          "method": "GET",
          "group": "static_data",
          "host": [
            "127.0.0.1:7777"
          ]
        }
      ]
    }
  ]
}
```

去尝试检察语法是否正确
```shell
melody check -c melody.json

> Parsing configuration file: melody.json
Syntax OK!
```

去掉上面配置文件中endpoint:`/get-person`下的所有backends

```shell
// melody.json中的某个
melody check -c melody.json 

> Parsing configuration file: melody.json
ERROR parsing the configuration file.
 'melody.json': ERROR: path:/get-person, method:POST has 0 backends
```

### 启用调试

依旧上上面的配置文件，不错这次我们通过Debug的方式来`check`

```shell
melody check -c melody.json -d

>
Parsing configuration file: melody.json
Parsed configuration: CacheTTL: 5m0s, Port: 8000
Hosts: []
Extra (2):
  melody_gologging: map[format:default level:DEBUG prefix:[Grant] stdout:true syslog:false]
  melody_http_server_handler: map[name:[plugin_gologging]]
Endpoints (3):
	Endpoint: /get-person, Method: POST, CacheTTL: 0s, Concurrent: 0, QueryString: []
	Extra (1):
	  melody_jsonschema: map[properties:map[city:map[type:string] number:map[type:number] user:map[properties:map[age:map[type:number] name:map[type:string]] type:object]] type:object]
	Backends (0):
	Endpoint: /findone/{name}, Method: GET, CacheTTL: 0s, Concurrent: 1, QueryString: []
	Extra (1):
	  melody_proxy: map[sequential:true]
	Backends (2):
		URL: /user/{name}, Method: GET
			Timeout: 0s, Target: , Mapping: map[], BL: [], WL: [], Group: base_info
			Hosts: [127.0.0.1:8001]
			Extra (0):
		URL: /role/{resp0_base_info.role_id}, Method: GET
			Timeout: 0s, Target: , Mapping: map[], BL: [], WL: [], Group: role_info
			Hosts: [127.0.0.1:8001]
			Extra (0):
	Endpoint: /static, Method: GET, CacheTTL: 0s, Concurrent: 1, QueryString: []
	Extra (1):
	  melody_proxy: map[sequential:true static:map[data:map[static:[map[static1:1] map[static2:true] map[static3:hello]]] strategy:[success]]]
	Backends (2):
		URL: roles, Method: GET
			Timeout: 0s, Target: , Mapping: map[], BL: [], WL: [], Group: roles
			Hosts: [127.0.0.1:8001]
			Extra (1):
			  melody_proxy: map[flatmap_filter:[map[args:[data.0.ID data.0.role_id] type:move] map[args:[data.0.CreatedAt data.0.create_at] type:move] map[args:[data.1.roleName] type:del]]]
		URL: /role/static, Method: GET
			Timeout: 0s, Target: , Mapping: map[], BL: [], WL: [], Group: static_data
			Hosts: [127.0.0.1:7777]
			Extra (0):
ERROR parsing the configuration file.
 'melody.json': ERROR: path:/get-person, method:POST has 0 backends
```

## Graph

这个命令是为了使得你的配置文件更加直观，当你在完成了配置文件的书写之后，也通过了`check`的验证，在语法或语义上并没有什么问题，但是有可能某些设置并不是你想要的，你可以通过`graph`命令来生成有向图来预览你的配置文件，或者说是你即将启动的 _Melody_ 服务

但是要注意的是，因为绘图主要使用了[graphviz](http://www.graphviz.org)中的`dot`语言，所以在此之前你得确保你的机器上安装了[graphviz](http://www.graphviz.org)

```shell 
melody graph -h
>
......
......

Generate a simple example diagram according to service config
But your computer needs graphviz, you can install this software by

  brew install graphviz

and you can generate png with command

  ./melody graph -c melody.json | dot -Tpng -o config.png

Usage:
  melody graph [flags]

Aliases:
  graph, validate

Examples:
melody check -d -c config.json

Flags:
  -h, --help   help for graph

Global Flags:
  -c, --config string   Path of the melody.json
  -d, --debug           Enable the Melody debug
```

通过`-h`参数你可以清晰的看到这个命令的作用，以及用法，一般来说，只需要使用这条命令就足够了
```shell
melody graph -c melody.json | dot -Tpng -o config.png
```

### 举个栗子

再次拿上面`check`的配置文件作为示例

```
melody graph -c melody.json | dot -Tpng -o config.png 

> 
...
config.png
...
...
```
在你当前目录下会多出`config.png`文件

![config.png](/melody-docs/config_example.png)


## Help

查看帮助
```shell
melody -h

> 
......
......

Melody help you to sort out your complex api

Usage:
  melody [command]

Available Commands:
  check       check that the config
  graph       generate graph of melody server
  help        Help about any command
  run         run the Melody server

Flags:
  -c, --config string   Path of the melody.json
  -d, --debug           Enable the Melody debug
  -h, --help            help for melody

Use "melody [command] --help" for more information about a command.
```

