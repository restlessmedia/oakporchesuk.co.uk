// gulpfile.js
// Heavily inspired by Mike Valstar's solution:
// http://mikevalstar.com/post/fast-gulp-browserify-babelify-watchify-react-build/

var babelify = require('babelify'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  gulp = require('gulp'),
  livereload = require('gulp-livereload'),
  rename = require('gulp-rename'),
  source = require('vinyl-source-stream'),
  sourceMaps = require('gulp-sourcemaps'),
  uglify = require('gulp-uglify'),
  log = require('gulplog'),
  watchify = require('watchify'),
  sass = require('gulp-sass');

// This method makes it easy to use common bundling options in different tasks
function bundle(src, dest, options = {}) {

  const task = function (bundler) {
    // babelify (uses babelrc config - not specified here inline)
    bundler = bundler.transform(babelify)
      // Start bundle
      .bundle()
      .on('error', function (err) {
        log.error(err);
        // end this stream
        this.emit('end');
      })
      // Entry point
      .pipe(source(src))
      // Convert to gulp pipeline
      .pipe(buffer())
      // Rename output
      .pipe(rename('bundle.js'))
      .pipe(sourceMaps.init({ loadMaps: true }));

    // uglify if applicable
    if (options.release === true) {
      bundler = bundler.pipe(uglify());
    }

    // Strip inline source maps
    bundler = bundler.pipe(sourceMaps.write('./'))
      // Save 'bundle'
      .pipe(gulp.dest(dest));

    // Reload browser if applicable
    if (options.release !== true) {
      bundler = bundler.pipe(livereload());
    }

    return bundler;
  }

  // create bundler - browserify entry point
  let bundler = browserify(src, {
    extensions: ['.js', '.jsx']
  });

  // Watchify to watch source file changes if applicable
  if (options.release !== true) {
    bundler = bundler.plugin(watchify, { ignoreWatch: ['**/node_modules/**', '**/bower_components/**'] })
  }

  // first pass
  const result = task(bundler);

  // Re-run bundle on source updates
  bundler.on('update', function () {
    log.info('Updating bundle ' + src);
    task(bundler);
  });

  return result;
}

const buildBundle = function () {
  return bundle('./src/index.js', './build/js', {
    release: true
  });
}

const buildSass = function () {
  return gulp.task('sass', function () {
    return gulp.src('./src/scss/**/*.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(gulp.dest('./build/css'));
  });
}

const build = gulp.parallel(buildSass)

gulp.task('build', build);
gulp.task('default', build);
