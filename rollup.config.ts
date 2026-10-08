import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import externals from 'rollup-plugin-node-externals';

export default {
  input: './src/index.ts',
  output: {
    file: './lib/index.js',
    format: 'esm'
  },
  plugins: [externals(), typescript(), terser()]
};
