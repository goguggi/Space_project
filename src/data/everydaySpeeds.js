// 일상·우주에서 실제로 나오는 속도들 (21단계, D-97)
// 값과 출처: 아래 주석. 이 폴더 규칙대로 숫자는 여기에만 두고 계산은 physics/가 한다.
//
// 왜 필요한가: 이 프로젝트의 목적은 "광속 불변에서 나오는 시간 지연"을 몸으로 느끼게 하는 것이다.
//   그런데 시간 지연은 일상 속도에서는 너무 작아 실감이 안 난다. 그래서 우리가 이미 겪고 있는
//   속도들(걷기·비행기·지구 자전·지구 공전)을 같은 표에 놓고, 광속에 가까워질 때 값이 어떻게
//   폭발적으로 커지는지 한눈에 보이게 한다.
//
// 단위: m/s

// 소리의 속도 (15 °C 건조 공기). 마하 환산에 쓴다
export const SPEED_OF_SOUND = 340;

export const EVERYDAY_SPEEDS = [
  {
    id: 'walk', name: '사람이 걷기', icon: '🚶', speed: 1.4,
    source: '보통 걸음 약 5 km/h',
  },
  {
    id: 'ktx', name: 'KTX', icon: '🚄', speed: 83,
    source: '영업 최고 속도 300 km/h',
  },
  {
    id: 'jet', name: '여객기', icon: '✈️', speed: 250,
    source: '순항 속도 약 900 km/h',
  },
  {
    id: 'spin', name: '지구 자전 (적도)', icon: '🌍', speed: 465,
    // 적도 둘레 40,075 km ÷ 항성일 86,164 s = 465.1 m/s. 마하 1.4쯤 된다.
    source: '적도 둘레 40,075 km ÷ 항성일 86,164초 = 465 m/s',
    highlight: true,
  },
  {
    id: 'bullet', name: '소총 탄환', icon: '•', speed: 900,
    source: '일반적인 소총 탄속 800~1,000 m/s',
  },
  {
    id: 'iss', name: '국제우주정거장', icon: '🛰️', speed: 7_660,
    source: '고도 약 400 km 원궤도 속도',
  },
  {
    id: 'orbit', name: '지구 공전', icon: '🌞', speed: 29_780,
    source: '태양 둘레를 1년에 한 바퀴 (평균 궤도 속도)',
    highlight: true,
  },
  {
    id: 'voyager', name: '보이저 1호', icon: '🛸', speed: 17_000,
    source: '태양계를 벗어나는 중, 태양 기준 약 17 km/s',
  },
  {
    id: 'parker', name: '파커 태양 탐사선', icon: '☄️', speed: 191_000,
    source: '사람이 만든 가장 빠른 물체. 근일점 통과 시 약 191 km/s',
  },
];
