// Seoul Map Controller
// Seoul Map Controller
const SeoulMap = (function () {
    let isInitialized = false;
    let naverMap = null;

    // State
    const cachedData = {
        dong: null,
        gu: null
    };
    let currentMode = 'gu'; // 'dong' or 'gu' - 초기값은 구 단위

    // [추가] 장소 데이터 저장소
    let allPlaces = [];
    let naverMarkers = []; // 네이버 지도 마커 인스턴스 저장
    let infoWindows = []; // 인포윈도우 관리
    let markersVisible = true; // 마커 표시 여부

    // Data URLs
    const URLS = {
        dong: 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_submunicipalities_topo_simple.json',
        gu: 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_topo_simple.json'
    };

    // Helper: 혼잡도 배지 아이콘/텍스트
    function getCongestionBadge(level) {
        const badges = {
            'quiet': '●',
            'normal': '●●',
            'crowded': '●●●',
            'very_crowded': '!',
            'unknown': '?'
        };
        return badges[level] || '?';
    }

    // Mode Toggle Function
    async function setMode(mode) {
        if (currentMode === mode && cachedData[mode]) return;
        currentMode = mode;

        // Update Buttons UI
        document.querySelectorAll('.map-mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-mode-${mode}`);
        if (activeBtn) activeBtn.classList.add('active');

        await loadAndRender();
    }

    // [추가] 대기 중인 포커스 요청 저장
    let pendingFocusRequest = null;

    // [추가] 포커스 요청 처리 핸들러 (Refactored)
    function handleFocusRequest(placeId) {
        const place = allPlaces.find(p => p.id == placeId);
        if (place) {
            console.log(`지도 포커스 실행: ${place.name}`);

            // 1. 해당 장소의 구 폴리곤 찾기
            const guName = place.gu || (place.address ? place.address.split(' ')[1] : '');
            let districtPath = document.querySelector(`.district-path[data-name="${guName}"]`);

            if (!districtPath && guName) {
                const potentialMatches = document.querySelectorAll('.district-path');
                for (let path of potentialMatches) {
                    if (path.getAttribute('data-name').includes(guName) || guName.includes(path.getAttribute('data-name'))) {
                        districtPath = path;
                        break;
                    }
                }
            }

            if (districtPath) {
                console.log(`Simulating click on district: ${guName}`);
                districtPath.dispatchEvent(new Event('click'));

                setTimeout(() => {
                    if (naverMap) {
                        const loc = new naver.maps.LatLng(place.lat, place.lng);
                        naverMap.morph(loc, 17);
                    }
                }, 600);
            } else {
                console.warn(`District polygon not found for ${guName}, falling back to direct call.`);
                showNaverMap(guName || '서울', place.lat, place.lng);

                if (naverMap) {
                    const loc = new naver.maps.LatLng(place.lat, place.lng);
                    naverMap.morph(loc, 17);
                }
            }
        }
    }

    // Init function (Entry Point)
    async function init() {
        if (isInitialized) return;

        // [추가] 외부 메시지 리스너 (iframe 제어용)
        window.addEventListener('message', (event) => {
            if (event.data.type === 'FOCUS_PLACE' && event.data.placeId) {
                // 데이터 로드 전이면 큐에 저장
                if (allPlaces.length === 0) {
                    console.log('장소 데이터 로드 전 요청 대기:', event.data.placeId);
                    pendingFocusRequest = event.data.placeId;
                    return;
                }
                // 로드 완료 상태면 즉시 실행
                handleFocusRequest(event.data.placeId);
            }
        });

        await loadAndRender();
        isInitialized = true;

        // [추가] 대기 중인 요청이 있으면 처리
        if (pendingFocusRequest) {
            console.log('대기 중인 포커스 요청 처리:', pendingFocusRequest);
            handleFocusRequest(pendingFocusRequest);
            pendingFocusRequest = null;
        }
    }

    // Core Load & Render Logic
    async function loadAndRender() {
        try {
            // [추가] 장소 데이터 먼저 로드 (혼잡도 색상 적용을 위해)
            if (allPlaces.length === 0) {
                if (typeof fetchPlacesFromFirestore === 'function') {
                    try {
                        allPlaces = await fetchPlacesFromFirestore();
                        console.log(`Firebase에서 ${allPlaces.length}개의 장소 데이터를 로드했습니다.`);
                    } catch (err) {
                        console.warn('장소 데이터 로드 실패:', err);
                    }
                }
            }

            // 구 단위 데이터가 없으면 먼저 로드 (레이블용)
            if (!cachedData['gu']) {
                try {
                    const guResponse = await fetch(URLS['gu']);
                    if (guResponse.ok) {
                        const guTopoData = await guResponse.json();
                        const guObjectName = Object.keys(guTopoData.objects)[0];
                        cachedData['gu'] = topojson.feature(guTopoData, guTopoData.objects[guObjectName]);
                        console.log('구 단위 데이터 로드 완료 (레이블용)');
                    }
                } catch (err) {
                    console.warn('구 단위 데이터 로드 실패:', err);
                }
            }

            // Check Cache
            if (cachedData[currentMode]) {
                renderGeoJSONToSVG(cachedData[currentMode]);
                removeLoadingText(); // 캐시 사용 시에도 로딩 텍스트 제거
                return;
            }

            console.log(`Loading Seoul Map Data (${currentMode}-level)...`);

            // Show Loading Text if switching
            const svg = document.getElementById('seoul-svg');
            if (svg && svg.querySelectorAll('path').length === 0) {
                // Only if empty, otherwise we might be switching fast
            }

            const response = await fetch(URLS[currentMode]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const topoData = await response.json();

            // TopoJSON -> GeoJSON 변환
            if (!window.topojson) throw new Error("TopoJSON library not loaded");

            const objectName = Object.keys(topoData.objects)[0];
            const geoData = topojson.feature(topoData, topoData.objects[objectName]);

            cachedData[currentMode] = geoData;
            renderGeoJSONToSVG(geoData);

            console.log(`Seoul Map (${currentMode}) Rendered Successfully`);

            // 로딩 텍스트 제거
            removeLoadingText();

        } catch (error) {
            console.error('Failed to load map data:', error);
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.textContent = "지도를 불러오는데 실패했습니다.";
                loadingText.style.fill = "#ff6b6b";
            }
        }
    }

    // [추가] 로딩 텍스트를 페이드아웃하며 제거하는 함수
    function removeLoadingText() {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.style.transition = 'opacity 0.5s ease-out';
            loadingText.style.opacity = '0';
            setTimeout(() => {
                if (loadingText.parentNode) {
                    loadingText.remove();
                }
            }, 500);
        }
    }

    // [추가된 부분] 폴리곤의 중심 좌표 계산 함수
    function calculateCentroid(coordinates) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        // 다중 폴리곤 처리
        const flatten = (arr) => arr.flat(Infinity);
        // GeoJSON 좌표 구조에 따라 깊이가 다를 수 있음. 단순화하여 모든 좌표 추출
        const tempFlat = JSON.stringify(coordinates).replace(/\[/g, '').replace(/\]/g, '').split(',');

        let xSum = 0, ySum = 0, count = 0;

        for (let i = 0; i < tempFlat.length; i += 2) {
            const x = parseFloat(tempFlat[i]);
            const y = parseFloat(tempFlat[i + 1]);

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        return {
            lng: (minX + maxX) / 2,
            lat: (minY + maxY) / 2
        };
    }

    function renderGeoJSONToSVG(geojson) {
        if (!geojson) return;

        const svg = document.getElementById('seoul-svg');
        if (!svg) return;

        // Clear existing map elements (paths and markers)
        const paths = svg.querySelectorAll('.district-path');
        paths.forEach(p => p.remove());
        const markers = svg.querySelectorAll('.map-marker-group');
        markers.forEach(m => m.remove());

        // [추가] SVG 그라데이션 정의 추가 (한 번만 실행)
        if (!svg.querySelector('#markerGradients')) {
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            defs.id = 'markerGradients';

            // Quiet - 초록색 그라데이션
            const gradQuiet = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradQuiet.setAttribute("id", "gradientQuiet");
            gradQuiet.setAttribute("x1", "0%");
            gradQuiet.setAttribute("y1", "0%");
            gradQuiet.setAttribute("x2", "0%");
            gradQuiet.setAttribute("y2", "100%");
            gradQuiet.innerHTML = `
                <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#43a047;stop-opacity:1" />
            `;
            defs.appendChild(gradQuiet);

            // Normal - 노란색 그라데이션
            const gradNormal = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradNormal.setAttribute("id", "gradientNormal");
            gradNormal.setAttribute("x1", "0%");
            gradNormal.setAttribute("y1", "0%");
            gradNormal.setAttribute("x2", "0%");
            gradNormal.setAttribute("y2", "100%");
            gradNormal.innerHTML = `
                <stop offset="0%" style="stop-color:#ffca28;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#ffa000;stop-opacity:1" />
            `;
            defs.appendChild(gradNormal);

            // Crowded - 주황/빨강 그라데이션
            const gradCrowded = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradCrowded.setAttribute("id", "gradientCrowded");
            gradCrowded.setAttribute("x1", "0%");
            gradCrowded.setAttribute("y1", "0%");
            gradCrowded.setAttribute("x2", "0%");
            gradCrowded.setAttribute("y2", "100%");
            gradCrowded.innerHTML = `
                <stop offset="0%" style="stop-color:#ff7043;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#e53935;stop-opacity:1" />
            `;
            defs.appendChild(gradCrowded);

            // Very Crowded - 진한 빨강 그라데이션
            const gradVeryCrowded = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradVeryCrowded.setAttribute("id", "gradientVeryCrowded");
            gradVeryCrowded.setAttribute("x1", "0%");
            gradVeryCrowded.setAttribute("y1", "0%");
            gradVeryCrowded.setAttribute("x2", "0%");
            gradVeryCrowded.setAttribute("y2", "100%");
            gradVeryCrowded.innerHTML = `
                <stop offset="0%" style="stop-color:#d32f2f;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#b71c1c;stop-opacity:1" />
            `;
            defs.appendChild(gradVeryCrowded);

            // Unknown - 회색 그라데이션
            const gradUnknown = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradUnknown.setAttribute("id", "gradientUnknown");
            gradUnknown.setAttribute("x1", "0%");
            gradUnknown.setAttribute("y1", "0%");
            gradUnknown.setAttribute("x2", "0%");
            gradUnknown.setAttribute("y2", "100%");
            gradUnknown.innerHTML = `
                <stop offset="0%" style="stop-color:#bdbdbd;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#757575;stop-opacity:1" />
            `;
            defs.appendChild(gradUnknown);

            // 구 이름 레이블용 금색 그라데이션
            const labelGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            labelGrad.setAttribute("id", "labelGradient");
            labelGrad.setAttribute("x1", "0%");
            labelGrad.setAttribute("y1", "0%");
            labelGrad.setAttribute("x2", "0%");
            labelGrad.setAttribute("y2", "100%");
            labelGrad.innerHTML = `
                <stop offset="0%" style="stop-color:#E8D68A;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#C9A526;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#A88620;stop-opacity:1" />
            `;
            defs.appendChild(labelGrad);

            svg.appendChild(defs);
        }

        // Calculate Bounds for Projection
        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

        // 전체 좌표 순회하며 바운더리 계산
        geojson.features.forEach(feature => {
            // 중심점 계산을 위해 미리 바운더리 파악
            const centroid = calculateCentroid(feature.geometry.coordinates);
            feature.properties.centroid = centroid; // 계산된 중심점 저장

            if (centroid.lng < minLng) minLng = centroid.lng;
            if (centroid.lng > maxLng) maxLng = centroid.lng;
            if (centroid.lat < minLat) minLat = centroid.lat;
            if (centroid.lat > maxLat) maxLat = centroid.lat;
        });

        // Add padding (약간의 여백) - 서울 전체 범위 기준
        // minLng = 126.76; maxLng = 127.19;
        // minLat = 37.42; maxLat = 37.70;
        // 동적 바운더리 사용시
        const padding = 0.05;
        // minLng -= padding; maxLng += padding; ... 
        // 기존 하드코딩 유지
        minLng = 126.76; maxLng = 127.19;
        minLat = 37.42; maxLat = 37.70;

        // Use viewBox dimensions
        const width = 800;
        const height = 600;

        // Projection Function
        function project(lng, lat) {
            // [수정됨] 지도 크기 10% 축소 (scale 0.9)
            const scale = 0.9;
            const w = width - 40;
            const h = height - 40;
            const offsetX = 20 + (w * (1 - scale) / 2);
            const offsetY = 20 + (h * (1 - scale) / 2);

            const x = (lng - minLng) / (maxLng - minLng) * (w * scale) + offsetX;
            const y = height - ((lat - minLat) / (maxLat - minLat) * (h * scale)) - offsetY;
            return [x, y];
        }

        // Render Paths
        geojson.features.forEach(feature => {
            // [수정됨] 이름 속성 처리 (동: adm_nm, 구: SIG_KOR_NM 등)
            const name = feature.properties.name || feature.properties.adm_nm || feature.properties.SIG_KOR_NM || "Unknown";
            let pathData = "";

            const processPolygon = (ring) => {
                // Ring 좌표가 [lng, lat] 배열로 들어옴
                return "M" + ring.map(pt => {
                    const [x, y] = project(pt[0], pt[1]);
                    return `${x},${y}`;
                }).join(" ") + "Z";
            };

            // GeoJSON Geometry Type 처리
            if (feature.geometry.type === 'Polygon') {
                pathData = feature.geometry.coordinates.map(processPolygon).join(" ");
            } else if (feature.geometry.type === 'MultiPolygon') {
                pathData = feature.geometry.coordinates.map(poly => poly.map(processPolygon).join(" ")).join(" ");
            }

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("class", "district-path");
            path.setAttribute("data-name", name);

            // [수정됨] 혼잡도별 5단계 프리미엄 색상 팔레트 (Muted/Chic Tones)
            const congestionPalette = {
                'quiet': "rgba(75, 107, 85, 0.6)",        // Quiet: Muted Moss Green
                'normal': "rgba(141, 123, 85, 0.55)",     // Normal: Desaturated Ochre
                'crowded': "rgba(148, 97, 85, 0.6)",      // Crowded: Dusty Rust
                'very_crowded': "rgba(115, 65, 65, 0.55)", // Very Crowded: Muted Burgundy
                'unknown': "rgba(70, 75, 80, 0.6)"        // Unknown: Dark Slate
            };

            let districtColor;

            // [추가] 구 단위 모드일 때만 실제 혼잡도 데이터 적용
            if (currentMode === 'gu') {
                // 해당 구에 속하는 장소 찾기 (구 이름 매칭)
                // 예: "강남구" -> "강남"으로 매칭하거나, 정확한 이름 매칭
                const districtPlaces = allPlaces.filter(place => {
                    if (!place.address) return false;
                    // 주소에 구 이름이 포함되어 있는지 확인
                    return place.address.includes(name);
                });

                if (districtPlaces.length > 0) {
                    // 첫 번째 장소의 혼잡도 사용
                    const congestionLevel = districtPlaces[0].congestion || 'unknown';
                    districtColor = congestionPalette[congestionLevel] || congestionPalette['unknown'];
                } else {
                    // 마커가 없는 구는 가장 혼잡도 낮은 색 (quiet)
                    districtColor = congestionPalette['quiet'];
                }
            } else {
                // 동 단위 모드일 때는 랜덤 색상 유지
                const paletteArray = Object.values(congestionPalette);
                districtColor = paletteArray[Math.floor(Math.random() * paletteArray.length)];
            }

            const strokeColor = "rgba(255, 255, 255, 0.7)"; // 은은한 경계선
            const hoverColor = "rgba(212, 175, 55, 0.55)"; // 호버 시 금색 (Gold Accent)

            // 스타일 조정
            path.style.stroke = strokeColor;
            path.style.strokeWidth = "0.5px"; // 얇고 세련된 라인
            path.style.fill = districtColor;
            path.style.transition = "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // 부드러운 전환

            // 호버 효과: 해당 구역이 금색으로 빛나며 강조됨
            path.onmouseenter = function () {
                this.style.fill = hoverColor;
                this.style.stroke = "rgba(212, 175, 55, 0.8)"; // 경계선도 진한 금색
                this.style.strokeWidth = "1px";
                this.style.filter = "drop-shadow(0 0 10px rgba(212, 175, 55, 0.4))"; // 글로우 효과
                this.style.zIndex = "100";
            };

            path.onmouseleave = function () {
                this.style.fill = districtColor; // 원래의 혼잡도 색상으로 복귀
                this.style.stroke = strokeColor;
                this.style.strokeWidth = "0.5px";
                this.style.filter = "";
                this.style.zIndex = "";
            };

            // Click Event: Switch to Naver Map
            path.onclick = () => {
                const centroid = feature.properties.centroid;
                if (centroid) {
                    showNaverMap(name, centroid.lat, centroid.lng);
                }
            };

            // Tooltip
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = name;
            path.appendChild(title);

            svg.appendChild(path);
        });

        // [추가] 구 이름 레이블 표시 (항상 구 데이터 사용)
        addDistrictLabels(svg, project);

        function addDistrictLabels(svg, project) {
            // 구 단위 데이터가 없으면 레이블 표시 안 함
            if (!cachedData['gu']) return;

            const guData = cachedData['gu'];

            guData.features.forEach(feature => {
                const name = feature.properties.name || feature.properties.SIG_KOR_NM || feature.properties.adm_nm || "Unknown";

                // 중심점 계산 (없으면 직접 계산)
                let centroid = feature.properties.centroid;
                if (!centroid) {
                    centroid = calculateCentroid(feature.geometry.coordinates);
                    feature.properties.centroid = centroid;
                }

                const [x, y] = project(centroid.lng, centroid.lat);

                // SVG 텍스트 요소 생성
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", x);
                text.setAttribute("y", y);
                text.setAttribute("class", "district-label");
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                // "중구"는 예외로 풀네임 표시, 나머지는 마지막 '구' 제거
                const displayName = name === '중구' ? name : name.replace(/구$/, '');
                text.textContent = displayName; // "강남구" -> "강남", "구로구" -> "구로", "중구" -> "중구"

                svg.appendChild(text);
            });
        }


        // [수정됨] Firebase에서 가져온 실제 장소 데이터로 마커 추가
        const addPlaceMarkers = async () => {
            try {
                // 데이터가 없으면 아무것도 하지 않음 (이미 loadAndRender에서 로드됨)
                if (allPlaces.length === 0) {
                    console.warn('표시할 장소 데이터가 없습니다.');
                    return;
                }

                const places = allPlaces; // 로컬 변수 맵핑

                // 좌표가 있는 장소만 필터링
                const validPlaces = places.filter(place => place.lat && place.lng);
                console.log(`${validPlaces.length}개의 유효한 좌표 데이터를 찾았습니다.`);

                validPlaces.forEach(place => {
                    // 좌표를 SVG 좌표로 변환
                    const [cx, cy] = project(place.lng, place.lat);

                    // 마커 컨테이너 그룹 (위치 지정)
                    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    g.setAttribute("class", "map-marker-group");
                    g.setAttribute("data-place-id", place.id);
                    g.setAttribute("data-place-name", place.name);
                    g.setAttribute("transform", `translate(${cx}, ${cy}) scale(0.56)`);

                    // 1. 그림자 (Shadow) - 바닥에 고정
                    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                    shadow.setAttribute("cx", "0");
                    shadow.setAttribute("cy", "0");
                    shadow.setAttribute("rx", "6");
                    shadow.setAttribute("ry", "2.5");
                    shadow.setAttribute("class", "map-pin-shadow");
                    g.appendChild(shadow);

                    // 2. 핀 그룹 (Pin Group) - 튀어오르는 애니메이션 적용 대상
                    const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    pinGroup.setAttribute("class", "map-pin");

                    // 핀 모양 패스 (Teardrop shape)
                    const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    const d = "M0,0 C-6,-8 -12,-15 -12,-22 A12,12 0 1,1 12,-22 C12,-15 6,-8 0,0 Z";
                    pinPath.setAttribute("d", d);

                    // 혼잡도에 따른 색상 적용
                    const congestionColor = typeof getCongestionColor === 'function'
                        ? getCongestionColor(place.congestion)
                        : '#9E9E9E'; // 기본 회색
                    pinPath.setAttribute("fill", congestionColor);
                    pinPath.setAttribute("stroke", "#333");
                    pinPath.setAttribute("stroke-width", "0.5");
                    pinGroup.appendChild(pinPath);

                    // 핀 내부 구멍 (White Hole)
                    const pinHole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    pinHole.setAttribute("cx", "0");
                    pinHole.setAttribute("cy", "-22");
                    pinHole.setAttribute("r", "4.5");
                    pinHole.setAttribute("fill", "white");
                    pinGroup.appendChild(pinHole);

                    // 마커 클릭 이벤트 - 장소 상세 정보 표시
                    g.style.cursor = "pointer";
                    g.onclick = () => {
                        console.log(`장소 클릭: ${place.name} (혼잡도: ${place.congestion})`);
                        // 상세 정보 모달 표시 (detail.html에 있는 기능 사용)
                        if (typeof showPlaceDetail === 'function') {
                            showPlaceDetail(place);
                        } else {
                            // 간단한 알림으로 대체
                            const congestionText = typeof getCongestionText === 'function'
                                ? getCongestionText(place.congestion)
                                : place.congestion;
                            alert(`${place.name}\n주소: ${place.address}\n혼잡도: ${congestionText}\n\n${place.congestionMsg || ''}`);
                        }
                    };

                    // 마커 호버 효과
                    g.onmouseenter = function () {
                        this.style.transform = `translate(${cx}px, ${cy}px) scale(0.68)`;
                        this.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
                    };
                    g.onmouseleave = function () {
                        this.style.transform = `translate(${cx}px, ${cy}px) scale(0.56)`;
                        this.style.filter = "";
                    };

                    // 툴팁 (SVG title 요소)
                    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                    const congestionText = typeof getCongestionText === 'function'
                        ? getCongestionText(place.congestion)
                        : place.congestion;
                    title.textContent = `${place.name}\n혼잡도: ${congestionText}`;
                    g.appendChild(title);

                    g.appendChild(pinGroup);
                    svg.appendChild(g);

                    // 마커 토글 상태에 따라 표시/숨김
                    if (!markersVisible) {
                        g.style.display = 'none';
                        g.style.opacity = '0';
                    }
                });

                console.log(`${validPlaces.length}개의 장소 마커가 지도에 추가되었습니다.`);
            } catch (error) {
                console.error('장소 마커 추가 중 오류 발생:', error);
            }
        };

        // 비동기 함수 실행
        addPlaceMarkers();
    }

    // --- Naver Map Logic & Features ---

    // 네이버 지도 표시 및 기능 초기화
    function showNaverMap(name, lat, lng) {
        const seoulWrapper = document.getElementById('seoul-map-wrapper');
        const naverWrapper = document.getElementById('naver-map-wrapper');

        // UI 전환
        seoulWrapper.classList.add('hidden');
        naverWrapper.classList.add('active');

        // 지도 초기화 또는 이동
        if (!naverMap) {
            initNaverMap(lat, lng);
            // 이벤트 바인딩은 지도가 로드된 후 한 번만
            bindNaverMapEvents();
        } else {
            const newCenter = new naver.maps.LatLng(lat, lng);
            naverMap.setCenter(newCenter);
            naverMap.setZoom(16);
        }

        // 현재 지역 필터링 (선택된 구/동과 관련된 장소만 보여주거나, 가까운 거리 순)
        // 여기서는 일단 모든 마커를 보여주고 지도를 이동시킴
        updateNaverMarkers('all');
        if (typeof window.renderPlaceList === 'function') {
            window.renderPlaceList(allPlaces);
        }

        console.log(`Switched to Naver Map: ${name} (${lat}, ${lng})`);
    }

    // 네이버 지도 객체 생성
    function initNaverMap(lat, lng) {
        naverMap = new naver.maps.Map('naver-map', {
            gl: true, // 절대 지우지 말 것
            center: new naver.maps.LatLng(lat, lng),
            zoom: 16,
            minZoom: 10,
            scaleControl: false,
            logoControl: false,
            mapDataControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT
            },
            // 사용자 지정 스타일 ID
            customStyleId: '4166f2a1-c2fa-4d09-92ae-13802768e969' //절대 지우지 말 것
        });
    }

    // 이벤트 리스너 바인딩 (최초 1회)
    function bindNaverMapEvents() {
        // 검색
        const searchInput = document.getElementById('map-search-input');
        const searchBtn = document.getElementById('map-search-btn');

        const doSearch = () => {
            if (searchInput) searchPlaces(searchInput.value);
        };

        if (searchBtn) searchBtn.addEventListener('click', doSearch);
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doSearch();
            });
        }

        // 카테고리 필터
        const tags = document.querySelectorAll('.map-tag');
        tags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                // Active 상태 변경
                tags.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                // 필터링 실행
                const cat = e.target.getAttribute('data-cat');
                filterPlaces(cat);
            });
        });

        // 내 위치
        const btnMyLoc = document.getElementById('btn-my-location');
        if (btnMyLoc) {
            btnMyLoc.addEventListener('click', () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(position => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        if (naverMap) {
                            const newCenter = new naver.maps.LatLng(lat, lng);
                            naverMap.morph(newCenter, 16);
                        }
                    }, (err) => {
                        console.error(err);
                        alert('위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
                    });
                } else {
                    alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
                }
            });
        }
    }

    // 마커 생성 및 갱신 Core Logic
    function updateNaverMarkers(category, keyword = null) {
        if (!naverMap) return;

        // 기존 마커 제거
        naverMarkers.forEach(marker => marker.setMap(null));
        naverMarkers = [];

        // 필터링
        let filtered = allPlaces;

        if (category && category !== 'all') {
            filtered = filtered.filter(p => p.category && p.category.includes(category));
        }

        if (keyword) {
            const lowKey = keyword.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(lowKey)) ||
                (p.category && p.category.toLowerCase().includes(lowKey)) ||
                (p.features && p.features.some(f => f.toLowerCase().includes(lowKey)))
            );
        }

        // 새 마커 생성
        filtered.forEach(place => {
            if (!place.lat || !place.lng) return;

            // HTML 마커 콘텐츠 (SVG)
            // seoul-map.css/js의 디자인을 그대로 활용 (Inline SVG)
            // 외부 함수 getCongestionColor 사용
            const congestionColor = typeof getCongestionColor === 'function'
                ? getCongestionColor(place.congestion)
                : '#9E9E9E';

            // 그림자를 위한 Blur는 CSS 필터 사용. 네이버 지도는 오버레이가 많아 성능 고려 필요.
            const markerHtml = `
                <div class="naver-marker-wrap" style="cursor: pointer; position: relative;">
                    <div class="map-marker-group" style="transform: scale(0.8);">
                        <svg width="40" height="50" viewBox="-20 -30 40 50" style="overflow: visible;">
                             <defs>
                                <radialGradient id="shadowGrad">
                                    <stop offset="0%" stop-color="rgba(0,0,0,0.4)" />
                                    <stop offset="100%" stop-color="rgba(0,0,0,0)" />
                                </radialGradient>
                             </defs>
                             <!-- 그림자 -->
                             <ellipse cx="0" cy="2" rx="8" ry="3" fill="url(#shadowGrad)"></ellipse>
                             <!-- 핀 -->
                             <path d="M0,0 C-6,-8 -12,-15 -12,-22 A12,12 0 1,1 12,-22 C12,-15 6,-8 0,0 Z" 
                                   fill="${congestionColor}" stroke="#fff" stroke-width="1.5"></path>
                             <!-- 내부 원 -->
                             <circle cx="0" cy="-22" r="4.5" fill="white"></circle>
                        </svg>
                    </div>
                    <!-- 호버 시 이름 표시 (CSS로 제어 가능하지만 간단히 인라인) -->
                    <div class="marker-label" style="
                        position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
                        background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px;
                        font-size: 12px; white-space: nowrap; opacity: 0; transition: opacity 0.2s; pointer-events: none;
                    ">${place.name}</div>
                </div>
            `;

            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(place.lat, place.lng),
                map: naverMap,
                title: place.name,
                icon: {
                    content: markerHtml,
                    size: new naver.maps.Size(40, 50),
                    anchor: new naver.maps.Point(20, 50)
                }
            });

            // 마커 클릭 이벤트
            naver.maps.Event.addListener(marker, 'click', () => {
                if (typeof showPlaceDetail === 'function') {
                    showPlaceDetail(place);
                }

                // 지도 중심 이동 및 확대
                naverMap.panTo(marker.getPosition());

                // 호버 효과 유지 등을 위해 스타일 변경 가능
            });

            // 호버 이벤트 (커스텀 HTML 마커이므로 DOM 이벤트 사용 불가, 네이버 API Event 사용)
            // 하지만 icon content가 HTML 문자열이면 DOM 접근이 어렵다.
            // 대신 mouseover 리스너를 통해 마커 zIndex 등을 조정할 수 있다.
            naver.maps.Event.addListener(marker, 'mouseover', () => {
                marker.setZIndex(100);
                // 라벨 표시 로직은 DOM 요소에 직접 접근해야 하는데, 네이버 마커는 내부적으로 div를 생성함.
                // 복잡하므로 여기서는 생략하거나, title 속성 활용.
            });
            naver.maps.Event.addListener(marker, 'mouseout', () => {
                marker.setZIndex(1);
            });

            naverMarkers.push(marker);
        });

        // 리스트 업데이트
        if (typeof window.renderPlaceList === 'function') {
            window.renderPlaceList(filtered);
        }
    }

    // 장소 검색 실행
    function searchPlaces(keyword) {
        if (!keyword || !keyword.trim()) {
            // 키워드 없으면 전체 보이기 (또는 현재 카테고리 유지 - 개선 필요)
            // 여기서는 단순화하여 전체 리셋
            updateNaverMarkers('all');
            return;
        }
        updateNaverMarkers(null, keyword);
    }

    // 카테고리 필터 실행
    function filterPlaces(category) {
        const searchInput = document.getElementById('map-search-input');
        const keyword = searchInput ? searchInput.value : null;
        updateNaverMarkers(category, keyword);
    }

    // 사이드바 리스트 렌더링 (map.html의 window.renderPlaceList 사용)
    // 혼잡도별 accordion 형식으로 표시됨

    // [Public] 리스트 클릭 시 해당 장소로 이동하기 위한 함수
    function focusPlace(placeId) {
        // ID 타입 변환 (문자열/숫자 호환)
        const place = allPlaces.find(p => p.id == placeId);
        if (place && naverMap) {
            const loc = new naver.maps.LatLng(place.lat, place.lng);
            naverMap.morph(loc, 17); // 줌인 & 이동

            // [수정됨] 리스트 클릭 시에도 모달을 띄우도록 변경 (장소 탐색 페이지와 일관성)
            if (typeof showPlaceDetail === 'function') {
                showPlaceDetail(place);
            }
        }
    }

    function backToSeoul() {
        const seoulWrapper = document.getElementById('seoul-map-wrapper');
        const naverWrapper = document.getElementById('naver-map-wrapper');

        naverWrapper.classList.remove('active');
        seoulWrapper.classList.remove('hidden');
    }

    // 마커 표시/숨김 토글
    function toggleMarkers() {
        markersVisible = !markersVisible;
        const btn = document.getElementById('btn-toggle-markers');
        const markers = document.querySelectorAll('.map-marker-group');

        if (markersVisible) {
            // 마커 표시
            markers.forEach(marker => {
                marker.style.display = '';
                marker.style.opacity = '1';
            });
            if (btn) btn.classList.add('active');
        } else {
            // 마커 숨김
            markers.forEach(marker => {
                marker.style.opacity = '0';
                setTimeout(() => {
                    marker.style.display = 'none';
                }, 300); // 페이드아웃 애니메이션 시간
            });
            if (btn) btn.classList.remove('active');
        }
    }

    // [추가] 장소 상세 모달 열기 (app.js의 기능 활용)
    function showPlaceDetail(place) {
        if (window.app && window.app.openPlaceModal) {
            window.app.openPlaceModal(place.id);
        } else {
            console.warn('App 인스턴스 또는 openPlaceModal 함수를 찾을 수 없습니다.');
            // Fallback: 간단한 알림
            alert(`${place.name}\n${place.address}\n\n(상세 모달을 로드하지 못했습니다)`);
        }
    }

    // 전역 스코프에 showPlaceDetail 노출 (마커 핸들러 등에서 사용)
    window.showPlaceDetail = showPlaceDetail;

    return {
        init,
        setMode,
        backToSeoul,
        focusPlace, // Public 노출
        toggleMarkers // 마커 토글 함수 노출
    };
})();
