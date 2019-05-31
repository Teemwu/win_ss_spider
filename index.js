import cheerio from 'cheerio'
import cp from 'child_process'
import fs from 'fs'
import http from 'http'
import querystring from 'querystring'
import urlParse from 'url'
import axios from 'axios'
import path from 'path'

/**
 * 爬取页面、修改应用配置、启动应用
 */
const jsonUrl = './Shadowsocks/gui-config.json'; //shadowsocket配置json文件路径
const exeUrl = './Shadowsocks/Shadowsocks.exe'; //shadowsocket应用程序路径
const jsonObj = require(jsonUrl);
const execFile = cp.execFile;

/**
 * 配置服务器
 */
const hostName = '127.0.0.1'; //设置主机名
const port = 8066; //设置端口
const server = http.createServer((req, res) => {
    // res.setHeader('Content-Type','text/plain');
    res.setHeader('Access-Control-Allow-Origin', "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); //允许跨域访问
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });

    const urlData = urlParse.parse(req.url);

    if (urlData.pathname === '/setting') {
        const obj = querystring.parse(urlData.query); //解析异步请求查询参数
        if (obj) {
            crawlPage(obj.url, obj.country, obj.line, res);
        } else {
            res.write(formatRes(false, '请求数据出错啦~', 'Request_Err', 400));
            res.end();
        }
    } else if (urlData.pathname === '/') {
        fs.readFile('./index.html', (err, data) => { //启动设置主页
            if (err) throw err;
            res.write(data);
            res.end();
        })
    } else {
        res.write(formatRes(false, '访问的页面走丢了！', 'Not_Found', 404));
        res.end();
    }
});

/**
 * 启动服务器
 */
server.listen(port, hostName, () => {
    const url = `http://${hostName}:${port}`;
    cp.exec(`start ${url}`);
    console.log(`服务器运行在：${url}`);
}).setTimeout(60000);


/**
 * 爬取页面信息
 */
function crawlPage (url, country, line, rep) {
    axios.get(url).then(res => {
        if (res.status === 200) {
            const $ = cheerio.load(res.data);
            const _nxt = country + line;
            saveFile({
                "server": $(`#ip${_nxt}`).text().trim(),
                "server_port": $(`#port${_nxt}`).text().trim(),
                "password": $(`#pw${_nxt}`).text().trim(),
                "method": "aes-256-cfb",
                "plugin": "",
                "plugin_opts": "",
                "remarks": "",
                "timeout": 5
            }, rep);
            rep.write(formatRes(true, '成功爬取页面信息！'));
        } else {
            rep.write('爬取页面出错！');
            rep.end();
        }
    }).catch(error => {
        console.log('error:', error);
        rep.write(formatRes(false, error.errno, error.code, 1400));
        rep.end();
    });
}

/**
 * 写入json文件到系统
 */
function saveFile (str, rep) {
    let newJson = jsonObj;
    newJson['configs'][0] = str;
    fs.writeFile(jsonUrl, JSON.stringify(newJson), 'utf8', err => {
        if (err) {
            throw err;
        } else {
            execShadowSock(rep);
        }
    });
}

/**
 * 关闭、启动系统应用
 */
function execShadowSock (rep) {
    // cp.spawn('taskkill',['/f','/im','Shadowsocks.exe']);//关闭
    execFile(exeUrl, (err, stdout, stderr) => { //启动
        console.log('应用已启动！');
        rep.end();
        if (err) throw err;
    });
}
/**
 * 返回消息统一格式
 */
function formatRes (success = true, msg = '操作成功！', codeName = 'SUCCESS', code = 1200) {
    return JSON.stringify({ success: success, msg: msg, codeName: codeName, code: code });
}