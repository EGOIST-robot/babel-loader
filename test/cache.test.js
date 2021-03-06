'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var assign = require('object-assign');
var expect = require('expect.js');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var webpack = require('webpack');

describe('Filesystem Cache', function() {
  this.timeout(15000);

  var cacheDir = path.resolve(__dirname, 'output/cache/cachefiles');
  var outputDir = path.resolve(__dirname, './output/cache/');
  var babelLoader = path.resolve(__dirname, '../');

  console.log('babelLoader', babelLoader);

  var globalConfig = {
    entry: './test/fixtures/basic.js',
    output: {
      path: outputDir,
      filename: '[id].cache.js',
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
        },
      ],
    },
  };

  // Clean generated cache files before each test
  // so that we can call each test with an empty state.
  beforeEach(function(done) {
    rimraf(outputDir, function(err) {
      if (err) { return done(err); }
      mkdirp(cacheDir, done);
    });
  });

  it('should output files to cache directory', function(done) {

    var config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.js$/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ['es2015'],
            },
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.not.be.empty();
        done();
      });
    });
  });

  it('should output files to OS\'s tmp dir', function(done) {
    var config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: true,
              presets: ['es2015'],
            },
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(os.tmpdir(), function(err, files) {
        files = files.filter(function(file) {
          return /\b[0-9a-f]{5,40}\.json\.gzip\b/.test(file);
        });

        expect(err).to.be(null);
        expect(files).to.not.be.empty();
        done();
      });
    });
  });

  it('should read from cache directory if cached file exists', function(done) {
    var loader = babelLoader;
    var config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: loader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ['es2015'],
            },
          },
        ],
      },
    });

    // @TODO Find a way to know if the file as correctly read without relying on
    // Istanbul for coverage.
    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      webpack(config, function(err, stats) {
        expect(err).to.be(null);
        fs.readdir(cacheDir, function(err, files) {
          expect(err).to.be(null);
          expect(files).to.not.be.empty();
          done();
        });
      });
    });

  });

  it('should have one file per module', function(done) {
    var loader = babelLoader;
    var config = assign({}, globalConfig, {
      module: {
        loaders: [
          {
            test: /\.jsx?/,
            loader: loader,
            exclude: /node_modules/,
            query: {
              cacheDirectory: cacheDir,
              presets: ['es2015'],
            },
          },
        ],
      },
    });

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.have.length(3);
        done();
      });
    });

  });


  it('should generate a new file if the identifier changes', function(done) {

    var configs = [
      assign({}, globalConfig, {
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                cacheIdentifier: 'a',
                presets: ['es2015'],
              },
            },
          ],
        },
      }),
      assign({}, globalConfig, {
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                cacheIdentifier: 'b',
                presets: ['es2015'],
              },
            },
          ],
        },
      }),
    ];
    var counter = configs.length;

    configs.forEach(function(config) {
      webpack(config, function(err, stats) {
        expect(err).to.be(null);
        counter -= 1;

        if (!counter) {
          fs.readdir(cacheDir, function(err, files) {
            expect(err).to.be(null);
            expect(files).to.have.length(6);
            done();
          });
        }
      });
    });

  });

  it('should allow to specify the .babelrc file', function(done) {
    var config = [
      assign({}, globalConfig, {
        entry: './test/fixtures/constant.js',
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                babelrc: path.resolve(__dirname, 'fixtures/babelrc'),
                presets: ['es2015'],
              },
            },
          ],
        },
      }),
      assign({}, globalConfig, {
        entry: './test/fixtures/constant.js',
        module: {
          loaders: [
            {
              test: /\.jsx?/,
              loader: babelLoader,
              exclude: /node_modules/,
              query: {
                cacheDirectory: cacheDir,
                presets: ['es2015'],
              },
            },
          ],
        },
      }),
    ];

    webpack(config, function(err, stats) {
      expect(err).to.be(null);

      fs.readdir(cacheDir, function(err, files) {
        expect(err).to.be(null);
        expect(files).to.have.length(2);
        done();
      });
    });
  });
});
