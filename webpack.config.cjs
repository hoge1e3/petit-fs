
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const type="esm";
const outputs={
  esm: {
    libraryTarget: 'module',
    path: `${__dirname}/dist`,
    filename: "index.js",
  },
  umd: {
    library: "vfs",
    libraryTarget: 'umd',
    path: `${__dirname}/dist`,
    filename: "index.umd.js",
  },
  test: {
    libraryTarget: 'module',
    path: `${__dirname}/test`,
    filename: "test.webpack.js",
  },
};
module.exports = (env,argv)=>["esm","umd","test"].map((type)=>({
    // モード値を production に設定すると最適化された状態で、
    // development に設定するとソースマップ有効でJSファイルが出力される
    mode: 'development',
    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: (type==="test"? './test/test.js': './src/index.js'),
    experiments: {
    	outputModule: type!=="umd",
    },
    output: outputs[type],
    module: {
        rules: [
            /*{
                // 拡張子 .ts の場合
                test: /\.ts$/,
                // TypeScript をコンパイルする
                use: {
        			loader:'ts-loader',
        		},
            },*/
        ],
        parser: {
          javascript: {
            importMeta: !env.production,
          },
        },
    },
    resolve: {
        // 拡張子を配列で指定
        extensions: [
            '.js',
        ],
    },
    plugins: [
      new IgnoreDynamicRequire()
    ],
}));
