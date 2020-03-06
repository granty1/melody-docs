module.exports = {
    title: 'Melody',
    description: 'Document of Melody',
    base: '/melody-docs/',
    themeConfig: {
        logo: '/melodylogo.png',
        nav: [
            {text: "使用文档", link: "/melody/document/"},
            {text: "Github", link: "https://github.com/granty1/melody"},
        ],
        sidebar: {
            '/melody/document/': [
                {
                    title: '使用文档',
                    collapsable: false,
                    sidebarDepth: 3,
                    children: [
                    '',           // 简介
                    'configfile', // 配置文件
                    'command',    // 命令行
                    'serverconfig',// 服务设置
                    'endpoint', // 节点(Endpoint)
                    ]
                },
                {
                    title: '插件扩展',
                    collapsable: false,
                    children: [
                    
                    ]
                },
                {
                    title: '问题反馈',
                    collapsable: false,
                    children: [
                    
                    ]
                }
            ]
        },
        lastUpdated: 'Last Updated', // string | boolean,
        // 默认值是 true 。设置为 false 来禁用所有页面的 下一篇 链接
        nextLinks: true,
        // 默认值是 true 。设置为 false 来禁用所有页面的 上一篇 链接
        prevLinks: true,
        smoothScroll: true
    },
    markdown: {
        lineNumbers: true
    }
}