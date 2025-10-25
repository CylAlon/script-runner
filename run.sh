#!/bin/bash
# ========================================
# 脚本名称: run.sh
# 功能: 演示参数数量判断
# ========================================

# 判断参数数量
case $# in
    0)
        echo "👉 未传递任何参数。"
        echo "用法示例:"
        echo "  ./args_demo.sh"
        echo "  ./args_demo.sh arg1"
        echo "  ./args_demo.sh arg1 arg2"
        ;;
    1)
        echo "✅ 收到一个参数: $1"
        ;;
    2)
        echo "✅ 收到两个参数:"
        echo "  参数1: $1"
        echo "  参数2: $2"
        ;;
    *)
        echo "⚠️ 参数过多，请最多传递两个参数！"
        echo "  实际传递: $# 个"
        ;;
esac