// 위도·경도 표시 서식 (1단계)
// 입력: 도 단위 실수 (북위/동경 +, 남위/서경 -)
// 출력: "34.43° N" 같은 문자열

export function formatLatitude(degrees) {
  const hemisphere = degrees >= 0 ? 'N' : 'S';
  return `${Math.abs(degrees).toFixed(2)}° ${hemisphere}`;
}

export function formatLongitude(degrees) {
  const hemisphere = degrees >= 0 ? 'E' : 'W';
  return `${Math.abs(degrees).toFixed(2)}° ${hemisphere}`;
}
