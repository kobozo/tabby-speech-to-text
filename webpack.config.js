const path = require('path')

module.exports = {
  target: 'node',
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'source-map',
  context: __dirname,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    pathinfo: true,
    libraryTarget: 'umd',
  },
  resolve: {
    modules: ['src/', 'node_modules', '../app/node_modules', '../node_modules'].map(x => path.join(__dirname, x)),
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
    ],
  },
  externals: [
    'fs',
    'ngx-toastr',
    'webpack',
    'source-map-support',
    'readline',
    'readline-sync',
    'keytar',
    'serialport',
    'node-pty',
    'child_process',
    'electron',
    /^rxjs/,
    /^@angular/,
    /^@ng-bootstrap/,
    /^tabby-/,
  ],
}
