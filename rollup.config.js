import buble from 'rollup-plugin-buble';
import { uglify } from 'rollup-plugin-uglify';
import {name} from './package.json';

export default {
  input: 'index.mjs',
  output: {
    file: 'index.js',
    format: 'cjs',
    name,
  },
  plugins: [
    buble({
      // https://buble.surge.sh/guide/
      objectAssign: 'Object.assign'
    }),
    uglify({
      // https://github.com/mishoo/UglifyJS2
      compress: false,
      mangle: false,
      output: {
        braces: true,
        beautify: true,
        // comments: true,
        indent_level: 2,
        quote_style: 1
      }
    })
  ]
};
