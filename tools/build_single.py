#!/usr/bin/env python3
# 파일 하나짜리 오프라인 실행본 만들기 (14단계 이후 추가)
#
# 왜 필요한가: 이 프로젝트는 ES 모듈로 되어 있어서 index.html을 file:// 로 바로 열면
#   브라우저가 모듈 불러오기를 막는다(CORS). 그래서 평소에는 로컬 서버로 연다.
#   하지만 서버 없이 "두 번 눌러 바로 보고 싶은" 경우가 있어, 모든 모듈과 CSS를 한 파일에 담은
#   `열기.html`을 만든다. 이 파일은 인터넷도 서버도 필요 없다.
#
# 어떻게: 모듈 소스를 문자열로 담아 두고, 브라우저에서 Blob URL로 만들어 순서대로 연결한다.
#   각 모듈의 import 경로는 만들어진 Blob URL로 바꿔치기한다. 모듈 문법과 이름 범위가 그대로
#   유지되므로, 소스를 합치면서 생기는 이름 충돌 같은 문제가 없다.
#
# 사용법 (저장소 최상위에서):
#   python tools/build_single.py
# 코드나 CSS를 고치면 다시 실행해서 `열기.html`을 새로 만든다.

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BARE = {'three': 'lib/three/three.module.js'}   # index.html의 importmap과 같은 뜻

# (원본 html, 진입 모듈, 만들 파일). 계산기 본체와 검증 페이지 둘 다 만든다
TARGETS = [
    ('index.html', 'src/main.js', '열기.html'),
    ('tests/physics.test.html', 'tests/physics.test.js', '검증.html'),
]

# from '...' / import '...' / import('...') 의 따옴표 안 경로를 찾는다
SPEC = re.compile(r"""(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\2""")


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def resolve(spec, importer):
    if spec in BARE:
        return BARE[spec]
    if spec.startswith('.'):
        base = os.path.dirname(importer)
        return os.path.normpath(os.path.join(base, spec)).replace(os.sep, '/')
    raise SystemExit(f'알 수 없는 import 경로: {spec} (from {importer})')


def collect(entry):
    """진입점에서 시작해 필요한 모듈을 모두 모은다. 반환: {경로: (치환된 소스, [의존 경로])}"""
    modules = {}
    todo = [entry]
    while todo:
        path = todo.pop()
        if path in modules:
            continue
        source = read(path)
        deps = []

        def sub(m):
            target = resolve(m.group(3), path)
            deps.append(target)
            return f'{m.group(1)}"__MOD__{target}__END__"'

        modules[path] = (SPEC.sub(sub, source), deps)
        todo.extend(deps)
    return modules


def build_one(html_path, entry, output):
    modules = collect(entry)
    html = read(html_path)
    css = read('src/styles/main.css')

    # <head>의 스타일시트 링크 → 인라인 <style> (검증 페이지처럼 링크가 없으면 그대로 둔다)
    html = re.sub(r'\s*<link rel="stylesheet"[^>]*>', lambda m: '\n  <style>\n' + css + '\n  </style>', html, count=1)
    # importmap과 모듈 진입점 <script> 제거 (아래 로더가 대신한다)
    html = re.sub(r'\s*<script type="importmap">.*?</script>', '', html, flags=re.S)
    html = re.sub(r'\s*<script type="module" src="[^"]*"></script>', '', html, count=1)
    # 안내 문구: 검증 페이지는 별도 파일이라 이 파일에서는 열 수 없다
    html = html.replace('<a href="tests/physics.test.html">계산 검증 페이지</a>',
                        '<a href="검증.html">계산 검증 페이지</a>')

    sources = {p: s for p, (s, _) in modules.items()}
    deps = {p: d for p, (_, d) in modules.items()}

    loader = """
  <script>
  // 파일 하나짜리 실행본 로더 (tools/build_single.py가 생성). 서버 없이 file:// 에서도 동작한다.
  // 각 모듈을 Blob URL로 만들고, import 경로를 그 URL로 바꿔 끼운 뒤 진입점을 불러온다.
  (function () {
    var SOURCES = __SOURCES__;
    var DEPS = __DEPS__;
    var ENTRY = __ENTRY__;
    var urls = {};
    var building = {};

    function build(path) {
      if (urls[path]) return urls[path];
      if (building[path]) throw new Error('모듈 순환 참조: ' + path);
      building[path] = true;
      (DEPS[path] || []).forEach(build);
      var code = SOURCES[path].replace(/__MOD__(.*?)__END__/g, function (_, dep) { return urls[dep]; });
      urls[path] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      building[path] = false;
      return urls[path];
    }

    try {
      import(build(ENTRY)).catch(show);
    } catch (e) { show(e); }

    function show(e) {
      console.error(e);
      var p = document.createElement('p');
      p.style.cssText = 'color:#ff8080;padding:12px';
      p.textContent = '불러오기 실패: ' + e.message + ' — 최신 크롬/엣지/파이어폭스에서 열어 주세요.';
      document.body.prepend(p);
    }
  })();
  </script>
"""
    loader = (loader
              .replace('__SOURCES__', json.dumps(sources, ensure_ascii=False))
              .replace('__DEPS__', json.dumps(deps, ensure_ascii=False))
              .replace('__ENTRY__', json.dumps(entry)))

    html = html.replace('</body>', loader + '</body>', 1)

    out = os.path.join(ROOT, output)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'{output} 생성 완료: 모듈 {len(modules)}개, {os.path.getsize(out) / 1024 / 1024:.2f} MB')


def main():
    for html_path, entry, output in TARGETS:
        build_one(html_path, entry, output)


if __name__ == '__main__':
    sys.exit(main())
