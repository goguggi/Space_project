# assets/earth — 지구 사진 (선택 사항)

이 폴더는 **비어 있어도 된다.** 사진이 없으면 `src/launch/earthTexture.js`가 그린 지구가 쓰인다.

## NASA 블루마블 사진 넣는 법 (더 사실적으로 보고 싶을 때)

1. NASA Visible Earth에서 내려받는다 (퍼블릭 도메인, 교육·발표용으로 자유롭게 쓸 수 있다):
   - 낮의 지구: https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography
     - 직접 주소: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg
   - 더 큰 판(구름 포함)도 같은 사이트에 있다. 파일이 크면 열기.html도 그만큼 커진다.
2. 내려받은 파일 이름을 **`blue_marble.jpg`**로 바꿔 이 폴더에 넣는다.
3. 로컬 서버로 열면(`index.html`) 바로 사진이 적용된다.
4. `열기.html`(더블클릭용 한 파일)에도 넣으려면 다시 만든다:
   ```
   python tools/build_single.py
   ```
   사진이 있으면 자동으로 파일 안에 박아 넣는다. 인터넷 없이도 사진이 보인다.

## 출처 표기

NASA Earth Observatory, Blue Marble (Reto Stöckli). 퍼블릭 도메인.
