import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 全局终端实例
let sharedTerminal: vscode.Terminal | undefined;

// 记录最后一次命令执行的时间
let lastCommandTime: number = 0;

// 记录终端创建的时间
let terminalCreatedTime: number = 0;

// 参数选项接口
interface ParamOption {
    label: string;  // 显示给用户的标签
    value: string;  // 实际的值
}

// 参数定义接口
interface ParamDefinition {
    name: string;           // 参数名称，用于在命令中占位符 {name}
    label: string;          // 参数的显示标签
    options: ParamOption[]; // 可选值列表
}

// 脚本配置接口
interface ScriptConfig {
    label: string;
    description?: string;
    command: string;
    params?: ParamDefinition[];  // 可选的参数定义
}

// 内置的常用命令
const BUILTIN_SCRIPTS: ScriptConfig[] = [
    // NPM 常用命令
    {
        label: '$(package) NPM: 安装依赖',
        description: 'npm install - 安装所有依赖',
        command: 'npm install'
    },
    {
        label: '$(play) NPM: 启动项目',
        description: 'npm start - 启动项目',
        command: 'npm start'
    },
    {
        label: '$(tools) NPM: 构建项目',
        description: 'npm run build - 构建项目',
        command: 'npm run build'
    },
    {
        label: '$(beaker) NPM: 运行测试',
        description: 'npm test - 运行测试',
        command: 'npm test'
    },
    {
        label: '$(rocket) NPM: 开发模式',
        description: 'npm run dev - 开发模式',
        command: 'npm run dev'
    },
    {
        label: '$(check) NPM: 代码检查',
        description: 'npm run lint - 代码检查',
        command: 'npm run lint'
    },

    // Git 常用命令
    {
        label: '$(git-branch) Git: 查看状态',
        description: 'git status - 查看仓库状态',
        command: 'git status'
    },
    {
        label: '$(sync) Git: 拉取代码',
        description: 'git pull - 从远程拉取最新代码',
        command: 'git pull'
    },
    {
        label: '$(repo-push) Git: 推送代码',
        description: 'git push - 推送代码到远程仓库',
        command: 'git push'
    },
    {
        label: '$(git-commit) Git: 提交暂存',
        description: 'git commit - 提交已暂存的更改',
        command: 'git commit'
    },
    {
        label: '$(add) Git: 添加所有',
        description: 'git add . - 添加所有更改到暂存区',
        command: 'git add .'
    },
    {
        label: '$(history) Git: 查看日志',
        description: 'git log --oneline -10 - 查看最近10条提交',
        command: 'git log --oneline -10'
    }
];

// 扩展激活时调用
export function activate(context: vscode.ExtensionContext) {
    console.log('Script Executor 扩展已激活');

    // 注册命令：打开脚本选择菜单
    let disposable = vscode.commands.registerCommand('script-executor.openMenu', async () => {
        // 获取合并后的脚本配置
        const scripts = getMergedScripts();

        if (scripts.length === 0) {
            vscode.window.showInformationMessage(
                '未配置任何脚本。请在设置中配置 scriptExecutor.scripts',
                '打开设置'
            ).then(selection => {
                if (selection === '打开设置') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'scriptExecutor.scripts');
                }
            });
            return;
        }

        // 转换为 QuickPick 项目格式
        const quickPickItems = scripts.map((script, index) => ({
            label: script.label,
            description: script.description,
            detail: `命令: ${script.command}`,
            scriptIndex: index
        }));

        // 显示快速选择菜单
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: '请选择要执行的脚本',
            matchOnDescription: true,
            matchOnDetail: true
        });

        // 处理选择结果
        if (selected !== undefined) {
            const script = scripts[selected.scriptIndex];
            // 跳过分隔符
            if (script.command === '_separator_') {
                return;
            }
            executeScript(script);
        }
    });

    context.subscriptions.push(disposable);

    // 监听终端关闭事件，清理终端引用
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (closedTerminal === sharedTerminal) {
                sharedTerminal = undefined;
                terminalCreatedTime = 0;
            }
        })
    );
}

// 从 .vscode/scripts.json 读取项目级脚本配置
function loadProjectScripts(): ScriptConfig[] {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return [];
    }

    const scriptsJsonPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'scripts.json');

    try {
        if (fs.existsSync(scriptsJsonPath)) {
            const content = fs.readFileSync(scriptsJsonPath, 'utf-8');
            const parsed = JSON.parse(content);

            // 支持两种格式：
            // 1. { "scripts": [...] }
            // 2. 直接是数组 [...]
            if (Array.isArray(parsed)) {
                return parsed;
            } else if (parsed.scripts && Array.isArray(parsed.scripts)) {
                return parsed.scripts;
            }
        }
    } catch (error) {
        console.error('加载 .vscode/scripts.json 失败:', error);
        vscode.window.showWarningMessage(
            `加载 .vscode/scripts.json 失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
    }

    return [];
}

// 获取合并后的脚本配置（项目配置优先）
function getMergedScripts(): ScriptConfig[] {
    const config = vscode.workspace.getConfiguration('scriptExecutor');
    const enableBuiltin = config.get<boolean>('enableBuiltinScripts', true);

    // 获取全局配置
    const globalConfig = vscode.workspace.getConfiguration('scriptExecutor', null);
    const globalScripts: ScriptConfig[] = globalConfig.get('scripts') || [];

    // 获取项目配置（如果有工作区）
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let workspaceSettingsScripts: ScriptConfig[] = [];

    if (workspaceFolder) {
        const workspaceConfig = vscode.workspace.getConfiguration('scriptExecutor', workspaceFolder.uri);
        const inspectResult = workspaceConfig.inspect<ScriptConfig[]>('scripts');

        // 只获取工作区级别的配置（.vscode/settings.json）
        workspaceSettingsScripts = inspectResult?.workspaceValue || inspectResult?.workspaceFolderValue || [];
    }

    // 从 .vscode/scripts.json 读取项目级配置
    const projectScripts = loadProjectScripts();

    // 合并配置：.vscode/scripts.json -> .vscode/settings.json -> 全局配置 -> 内置命令
    const mergedScripts: ScriptConfig[] = [];
    const addedCommands = new Set<string>();

    // 1. 添加 .vscode/scripts.json 中的脚本（最高优先级）
    for (const script of projectScripts) {
        mergedScripts.push(script);
        addedCommands.add(script.command);
    }

    // 2. 添加 .vscode/settings.json 中的项目配置的脚本
    for (const script of workspaceSettingsScripts) {
        if (!addedCommands.has(script.command)) {
            mergedScripts.push(script);
            addedCommands.add(script.command);
        }
    }

    // 3. 添加全局配置的脚本（排除重复的命令）
    for (const script of globalScripts) {
        if (!addedCommands.has(script.command)) {
            mergedScripts.push(script);
            addedCommands.add(script.command);
        }
    }

    // 4. 添加内置命令（如果启用且不重复）
    if (enableBuiltin) {
        // 添加分隔符（仅当有自定义脚本时）
        if (mergedScripts.length > 0) {
            mergedScripts.push({
                label: '$(ellipsis) ─────── 内置命令 ───────',
                description: '',
                command: '_separator_'
            });
        }

        for (const script of BUILTIN_SCRIPTS) {
            if (!addedCommands.has(script.command)) {
                mergedScripts.push(script);
                addedCommands.add(script.command);
            }
        }
    }

    return mergedScripts;
}

// 执行选中的脚本
async function executeScript(script: ScriptConfig) {
    let finalCommand = script.command;

    // 如果脚本有参数定义，需要让用户选择参数值
    if (script.params && script.params.length > 0) {
        const paramValues: { [key: string]: string } = {};

        // 遍历每个参数，让用户选择
        for (const param of script.params) {
            const quickPickItems = param.options.map(option => ({
                label: option.label,
                value: option.value
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: `请选择 ${param.label}`,
                matchOnDescription: true
            });

            // 如果用户取消选择，则中断执行
            if (!selected) {
                vscode.window.showInformationMessage('已取消执行脚本');
                return;
            }

            paramValues[param.name] = selected.value;
        }

        // 替换命令中的占位符
        finalCommand = replaceCommandParams(script.command, paramValues);
    }

    vscode.window.showInformationMessage(`正在执行：${script.label}`);
    executeTerminalCommand(finalCommand);
}

// 替换命令中的参数占位符
function replaceCommandParams(command: string, paramValues: { [key: string]: string }): string {
    let result = command;
    for (const [key, value] of Object.entries(paramValues)) {
        // 替换 {key} 格式的占位符
        const placeholder = `{${key}}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    return result;
}

// 在VSCode终端中执行命令
function executeTerminalCommand(command: string) {
    const config = vscode.workspace.getConfiguration('scriptExecutor');
    const reuseStrategy = config.get<string>('terminalReuseStrategy', 'smart');

    // 检查终端是否存在且未被关闭
    const allTerminals = vscode.window.terminals;
    const terminalExists = sharedTerminal && allTerminals.includes(sharedTerminal);

    let shouldCreateNewTerminal = false;

    // 根据策略决定是否创建新终端
    if (reuseStrategy === 'never') {
        // 总是创建新终端
        shouldCreateNewTerminal = true;
    } else if (reuseStrategy === 'always') {
        // 总是复用，只有在终端不存在时才创建
        shouldCreateNewTerminal = !terminalExists;
    } else if (reuseStrategy === 'smart') {
        // 智能检测
        if (!terminalExists) {
            shouldCreateNewTerminal = true;
        } else {
            // 检测终端是否可能正在运行交互式程序
            const mightBeInteractive = isTerminalLikelyInteractive(sharedTerminal!);

            if (mightBeInteractive) {
                shouldCreateNewTerminal = true;
            }
        }
    }

    // 创建或复用终端
    if (shouldCreateNewTerminal || !terminalExists) {
        // 如果是智能模式且检测到交互式程序，给出提示
        if (reuseStrategy === 'smart' && terminalExists) {
            vscode.window.showInformationMessage(
                '检测到终端可能正在运行交互式程序，已创建新终端执行命令'
            );
        }
        sharedTerminal = vscode.window.createTerminal('Script Executor');
        // 记录终端创建时间
        terminalCreatedTime = Date.now();
    }

    // 记录命令执行时间
    lastCommandTime = Date.now();

    // 显示终端并执行命令
    sharedTerminal!.show();

    // 优先使用 Shell Integration 执行命令（更可靠）
    if (sharedTerminal!.shellIntegration) {
        sharedTerminal!.shellIntegration.executeCommand(command);
    } else {
        sharedTerminal!.sendText(command);
    }
}

// 检测终端是否可能正在运行交互式程序
function isTerminalLikelyInteractive(terminal: vscode.Terminal): boolean {
    const config = vscode.workspace.getConfiguration('scriptExecutor');
    const idleTimeout = config.get<number>('terminalIdleTimeout', 10);

    // 如果超时设置为 0，表示始终复用，不检测
    if (idleTimeout === 0) {
        return false;
    }

    // 如果终端是新创建的（创建后还没超过空闲超时时间），认为是干净的，可以复用
    // 这样可以避免刚创建的终端又被检测为交互式而反复创建新终端
    const timeSinceCreation = (Date.now() - terminalCreatedTime) / 1000;
    if (terminalCreatedTime > 0 && timeSinceCreation < idleTimeout) {
        return false;
    }

    // 检查距离上次命令执行的时间
    const timeSinceLastCommand = (Date.now() - lastCommandTime) / 1000; // 转换为秒

    // 如果距离上次执行时间很短，认为是连续执行命令，终端状态正常
    if (timeSinceLastCommand < 2) {
        return false;
    }

    // 如果距离上次命令执行时间超过配置的空闲超时时间，
    // 且终端创建后也超过了空闲超时时间，
    // 认为终端可能正在运行交互式程序或用户可能手动输入了其他命令
    if (timeSinceLastCommand >= idleTimeout) {
        return true;
    }

    // 在超时时间内，检查 Shell Integration 状态
    // 注意：即使在运行交互式程序时，shellIntegration 也可能存在
    // 所以这不是一个完全可靠的指标
    if (!terminal.shellIntegration) {
        // 如果没有 Shell Integration，可能是在运行交互式程序
        return true;
    }

    // 其他情况认为终端状态正常
    return false;
}

// 扩展停用时调用
export function deactivate() {
    console.log('Script Executor 扩展已停用');
}
