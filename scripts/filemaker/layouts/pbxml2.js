/* eslint-disable -- JXA for `osascript -l JavaScript`: `run` is its entry point, and ObjC bridge properties like
   `pb.clearContents` are calls. */
ObjC.import('AppKit'); ObjC.import('Foundation');
// pbxml2.js read OUT.xml | write IN.xml | sentinel TAG -- FileMaker layout objects (XML2) on the pasteboard
function run(argv){
  var pb=$.NSPasteboard.generalPasteboard, T='dyn.ah62d4rv4gk8zuxnqgk';
  if(argv[0]==='sentinel'){ pb.clearContents; pb.setStringForType($('SENTINEL-'+argv[1]),'public.utf8-plain-text'); return 'sentinel set'; }
  if(argv[0]==='read'){
    var d=pb.dataForType(T); if(d.isNil()) return 'NO-XML2';
    var str=$.NSString.alloc.initWithDataEncoding(d,4);
    str.writeToFileAtomicallyEncodingError($(argv[1]),true,4,null); return 'XML2 bytes='+d.length;
  }
  if(argv[0]==='write'){
    var s=$.NSString.stringWithContentsOfFileEncodingError($(argv[1]),4,null);
    var d=s.dataUsingEncoding(4); pb.clearContents; pb.setDataForType(d,T); return 'written XML2 bytes='+d.length;
  }
}
