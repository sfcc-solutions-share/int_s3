const S3 = require('*/cartridge/scripts/services/aws/s3')

exports.exportS3 = function(parameters) {
    var directory = parameters.directory;
    const pattern = parameters.pattern;
    const prefix = parameters.prefix;

    if (directory[0] !== '/') {
        directory = '/' + directory;
    }

    // find all files that match the pattern
    const dir = new dw.io.File(dw.io.File.IMPEX + directory);
    if (!dir.exists) {
        return new dw.system.Status(dw.system.Status.ERROR, 'ERROR', 'Directory not found');
    }

    const files = dir.listFiles(function(file) {
        return !!file.name.match(pattern)
    });

    if (!files || files.length === 0) {
        return new dw.system.Status(dw.system.Status.OK, 'NO_FILES_FOUND', 'No files found');
    }

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var path = `/${prefix}/${file.name}`;
        S3.putFile(file, path)
    }
}
