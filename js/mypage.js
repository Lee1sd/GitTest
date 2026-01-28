document.addEventListener('DOMContentLoaded', async () => {
    // AuthGuard check (이미 auth-guard.js에서 처리하지만, 데이터 로딩을 위해)
    if (!AuthGuard.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const user = AuthGuard.getUser();
    const avatarEl = document.getElementById('mypage-avatar');
    const emailEl = document.getElementById('mypage-email');
    const nameInput = document.getElementById('display-name');
    const avatarInput = document.getElementById('avatar-input');
    const saveBtn = document.getElementById('save-btn');

    // UI 초기화
    if (user) {
        emailEl.textContent = user.email;
        nameInput.value = user.displayName || '';

        if (user.photoURL) {
            avatarEl.style.backgroundImage = `url('${user.photoURL}')`;
            avatarEl.textContent = '';
        }
    }

    // 이미지 업로드 처리
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 미리보기
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarEl.style.backgroundImage = `url('${e.target.result}')`;
            avatarEl.textContent = '';
        };
        reader.readAsDataURL(file);
    });

    // 저장 버튼 처리
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        try {
            const firebaseUser = window.auth.currentUser;
            if (!firebaseUser) throw new Error('로그인 정보가 없습니다.');

            const newName = nameInput.value.trim();
            const file = avatarInput.files[0];
            let photoURL = firebaseUser.photoURL;

            // 파일 업로드 (Firebase Storage)
            if (file) {
                if (!window.storage) {
                    throw new Error("Firebase Storage가 초기화되지 않았습니다.");
                }
                // 스토리지 참조 생성 (users/UID/profile.jpg)
                const storageRef = window.storage.ref().child(`users/${firebaseUser.uid}/profile_${Date.now()}.jpg`);
                await storageRef.put(file);
                photoURL = await storageRef.getDownloadURL();
            }

            // Firebase Auth 프로필 업데이트
            await firebaseUser.updateProfile({
                displayName: newName,
                photoURL: photoURL
            });

            // Firestore 업데이트
            await window.db.collection('users').doc(firebaseUser.uid).set({
                displayName: newName,
                photoURL: photoURL,
                email: firebaseUser.email,
                lastLoginTime: new Date() // 정보 수정 시에도 갱신하거나, updatedAt 필드를 쓸 수도 있음
            }, { merge: true });

            // LocalStorage 업데이트
            const userData = {
                ...user,
                displayName: newName,
                name: newName,
                photoURL: photoURL
            };
            localStorage.setItem('teumsae_user', JSON.stringify(userData));

            // 공통 헤더 등 UI 갱신
            // 공통 헤더 등 UI 갱신
            if (window.AuthGuard) {
                window.AuthGuard.updateHeaderUI();
            }

            // Toast 알림 표시
            showToast('프로필이 수정되었습니다.');

            // 잠시 후 새로고침 (사용자가 토스트를 볼 시간 확보)
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Profile update failed:', error);
            showToast('프로필 수정에 실패했습니다: ' + error.message, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '저장하기';
        }
    });

    // Toast 표시 함수
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        toastMessage.textContent = message;

        if (isError) {
            toast.classList.add('error');
            // 에러 아이콘 변경 (X 표시)
            toast.querySelector('.toast-icon').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
            toast.classList.remove('error');
            // 성공 아이콘 원래대로
            toast.querySelector('.toast-icon').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }

        toast.classList.add('show');

        // 3초 후 사라짐
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Firestore에서 최신 데이터 가져오기 (옵션)
    // 페이지 로드 시 로컬스토리지보다 최신 정보가 있을 수 있으므로 확인
    try {
        const firebaseUser = window.auth.currentUser; // 이 시점에 null일 수 있음 (onAuthStateChanged 대기 필요할 수도)
        // 일단 AuthGuard.getUser()로 초기화 후, firebase.auth().onAuthStateChanged로 보완
    } catch (e) {
        console.log(e);
    }
});

// Firebase Auth 상태 감지 후 추가 로딩 (선택 사항)
window.auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
        // Firestore 데이터 확인
        const doc = await window.db.collection('users').doc(firebaseUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            // 입력창 갱신
            document.getElementById('display-name').value = data.displayName || firebaseUser.displayName || '';
            if (data.photoURL) {
                document.getElementById('mypage-avatar').style.backgroundImage = `url('${data.photoURL}')`;
                document.getElementById('mypage-avatar').textContent = '';
            }
        }
    }
});
