var gulp         = require('gulp');
var browserSync  = require('browser-sync');
var sass         = require('gulp-sass');
var cssBase64    = require('gulp-css-base64');
var minifyCSS    = require('gulp-clean-css');
var minifyHTML   = require('gulp-minify-html');
var uglify       = require('gulp-uglify');
var uncss        = require('gulp-uncss');
var concat       = require('gulp-concat');
var rename       = require('gulp-rename');
var replace      = require('gulp-replace');
var notify       = require('gulp-notify');
var prefix       = require('gulp-autoprefixer');
var cp           = require('child_process');
var fs           = require('fs');
var ghPages      = require('gulp-gh-pages');
var extract      = require('gulp-html-extract');
var jekyll       = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages     = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn( jekyll , ['build', '--config', '_config.yml', '--incremental'], {stdio: 'inherit'})
        .on('close', done);
});



/**
 * Rebuild Jekyll & do page reload
 */
 gulp.task('jekyll-rebuild', ['optimize-html'], function () {
     browserSync.reload();
 });

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['optimize-html'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});

/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future jekyll builds)
 */
gulp.task('optimize-css', ['jekyll-build'], function () {
    return gulp.src('_site/css/main.css')
        // pipe urls to convert them to inline base64
        .pipe(cssBase64({
            // baseDir is needed because we prefix our filenames with "." so jekyll ignores them and does not copy them to _site/css
            // so, we use absolute url(/css/file.ext) to locate the actual file
            baseDir: "./",
            extensionsAllowed: ['.otf', '.jpg', '.png']
        }))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(rename('main.min.css'))
        .pipe(gulp.dest('_site/css'))
        .pipe(browserSync.reload({stream:true}))
});

gulp.task('copy-files', ['optimize-css'], function () {
    gulp.src(['admin/**'])
        .pipe(gulp.dest('_site/admin'))
});

gulp.task('optimize-js', ['copy-files'], function() {
     return gulp;
});

gulp.task('optimize-html', ['optimize-js'], function() {
	return gulp;
});

/**
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch(['*.+(html|md|yml)',
                // '+(_collections|_includes|_layouts|_sass|css)/**'],
                // add watch for netlify
                '+(admin|_collections|_includes|_layouts|_sass|css)/**'],
                function (event) {
                    console.log('changed', event)
                    gulp.run('jekyll-rebuild')
                });
    // gulp.watch(['_sass/*',
    //             'css/*.scss',
    //             'js/*.js',
    //             '*.html',
    //             '_layouts/*.html',
    //             '_includes/*.html',
    //             '_posts/*'], ['jekyll-rebuild']);
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);



/**
* Create production-ready website
*/
gulp.task('jekyll-build-prod', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn( jekyll , ['build', '--config', '_config.yml,_config.prod.yml'], {stdio: 'inherit'})
        .on('close', done);
});
gulp.task('optimize-css-prod', ['jekyll-build-prod'], function () {
    return gulp.src('_site/css/main.css')
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(uncss({
           html: ['_site/**/*.html'],
           ignore: []
       }))
        .pipe(rename('all.min.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('_site/public/css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(notify({ message: 'CSS-PROD task complete' }));
});
gulp.task('optimize-js-prod', ['optimize-css-prod'], function() {
  return gulp
            .src("_site/index.html")
            .pipe(extract())
            .pipe(concat('all.min.js'))
            .pipe(uglify())
            .pipe(gulp.dest('_site/public/js'))
            .pipe(notify({ message: 'JS-PROD task complete' }));
});
gulp.task('optimize-html-prod', ['optimize-js-prod'], function() {
	return gulp.src('_site/**/*.html')

		.pipe(replace(/<link rel=\"stylesheet\" href=\"\/public\/css\/all.min.css\"[^>]*>/, function(s) {
			var style = fs.readFileSync('_site/public/css/all.min.css', 'utf8');
			return '<style>' + style + '</style>';
		}))
		.pipe(replace(/<!--startjs-->[^]+<!--endjs-->/, function(s) {
			var js_script = fs.readFileSync('_site/public/js/all.min.js', 'utf8');
			return '<script type="text/javascript">' + js_script + '</script>';
		}))
    .pipe(minifyHTML({
      quotes: true
    }))
		.pipe(gulp.dest('_site/'))
    .pipe(notify({ message: 'HTML-PROD task complete' }));
});
gulp.task('push-to-gh-pages', ['optimize-html-prod'], function() {
  return gulp.src('./_site/**/*')
    .pipe(ghPages());
});
gulp.task('deploy',
  ['jekyll-build-prod',
    'optimize-css-prod',
    'optimize-js-prod',
    'optimize-html-prod',
    'push-to-gh-pages']);
