/**
 * HomeStay Dorm - Component Tra cứu phòng dùng chung
 * Thiết kế bởi Người 1. Có thể tái sử dụng cho các luồng nghiệp vụ khác.
 */

// Mock database dùng chung cho toàn bộ cấu phần tra cứu
const SHARED_ROOMS_DATABASE = [
    { id: "P101", area: "Khu A", type: "Nam", capacity: 6, price: 1800000, status: "Trống", amenities: ["Điều hòa", "Gửi xe"], history: [
        { date: "01/06/2026 09:00", title: "Cập nhật bởi Quản lý", desc: "Chuyển trạng thái từ Bảo trì sang Trống sau khi bảo dưỡng điều hòa." }
    ]},
    { id: "P102", area: "Khu A", type: "Nữ", capacity: 4, price: 2000000, status: "Chờ đặt cọc", amenities: ["Điều hòa", "Gửi xe", "Ban công"], history: [
        { date: "05/06/2026 10:30", title: "Tạo phiếu đặt cọc", desc: "Phiếu cọc PDC-29381 được lập bởi Sale Trần Thị B." }
    ]},
    { id: "P103", area: "Khu B", type: "Nam", capacity: 8, price: 1500000, status: "Đã đặt cọc", amenities: ["Gửi xe", "Yên tĩnh"], history: [
        { date: "03/06/2026 19:00", title: "Ghi nhận thanh toán cọc", desc: "Kế toán xác nhận nhận đủ 3,600,000 đ cọc." }
    ]},
    { id: "P104", area: "Khu B", type: "Nữ", capacity: 6, price: 1700000, status: "Đang thuê", amenities: ["Điều hòa", "Yên tĩnh"], history: [
        { date: "15/05/2026 08:00", title: "Bàn giao phòng", desc: "Đã ký biên bản bàn giao và bàn giao chìa khóa." }
    ]},
    { id: "P105", area: "Khu C", type: "Hỗn hợp", capacity: 4, price: 2500000, status: "Bảo trì", amenities: ["Điều hòa", "Tủ lạnh", "Ban công"], history: [
        { date: "25/05/2026 14:00", title: "Hệ thống bảo trì tự động", desc: "Khóa phòng để vệ sinh định kỳ." }
    ]}
];

function injectComponentStyles() {
    if (document.getElementById("tra-cuu-phong-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "tra-cuu-phong-styles";
    styleEl.innerHTML = `
        .lookup-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 24px;
            margin-top: 16px;
            position: relative;
        }
        .lookup-sidebar {
            background: white;
            padding: 24px;
            border-radius: 16px;
            border: 1px solid var(--gray-200);
            box-shadow: var(--shadow-sm);
            height: fit-content;
        }
        .lookup-sidebar h4 {
            margin-bottom: 16px;
            font-size: 16px;
            color: var(--gray-800);
            border-bottom: 1px solid var(--gray-100);
            padding-bottom: 8px;
        }
        .room-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
        }
        .room-card {
            background: white;
            border: 1px solid var(--gray-200);
            border-radius: 16px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.25s ease;
            position: relative;
            box-shadow: var(--shadow-sm);
        }
        .room-card:hover {
            border-color: var(--primary);
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }
        .room-card.selected {
            border-color: var(--primary);
            background: var(--primary-light);
            box-shadow: 0 0 0 2px var(--primary);
        }
        .room-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .room-code {
            font-weight: 800;
            font-size: 18px;
            color: var(--gray-800);
        }
        .room-info-row {
            font-size: 14px;
            color: var(--gray-600);
            margin-bottom: 8px;
        }
        .room-price {
            font-weight: 700;
            color: var(--primary);
            font-size: 16px;
            margin-top: 12px;
            border-top: 1px solid var(--gray-100);
            padding-top: 12px;
        }
        .detail-panel {
            position: fixed;
            top: 0;
            right: -500px;
            width: 500px;
            height: 100vh;
            background: white;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 32px;
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--gray-200);
        }
        .detail-panel.open {
            right: 0;
        }
        .detail-panel-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .detail-panel-backdrop.open {
            opacity: 1;
            pointer-events: auto;
        }
        .panel-close-btn {
            position: absolute;
            top: 24px;
            right: 24px;
            background: var(--gray-100);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .panel-close-btn:hover {
            background: var(--gray-200);
        }
        .panel-title {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .no-results-box {
            text-align: center;
            padding: 48px;
            background: var(--gray-100);
            border-radius: 16px;
            border: 2px dashed var(--gray-300);
        }
        @media(max-width: 992px) {
            .lookup-container {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(styleEl);
}

function initTraCuuPhong(containerId, options = {}) {
    // Inject styles
    injectComponentStyles();

    const container = document.getElementById(containerId);
    if (!container) return;

    const mode = options.mode || "browse"; // "browse" hoặc "select"
    const onSelect = options.onSelect || null;
    let selectedRoomId = options.selectedId || null;

    // Render HTML Scaffold
    container.innerHTML = `
        <div class="lookup-container">
            <!-- Sidebar bộ lọc -->
            <div class="lookup-sidebar">
                <h4> bộ lọc phòng</h4>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="font-size: 13px; font-weight:600; display:block; margin-bottom:6px;">Khu vực</label>
                        <select class="select" id="filter-area">
                            <option value="">Tất cả</option>
                            <option value="Khu A">Khu A</option>
                            <option value="Khu B">Khu B</option>
                            <option value="Khu C">Khu C</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight:600; display:block; margin-bottom:6px;">Loại phòng</label>
                        <select class="select" id="filter-type">
                            <option value="">Tất cả</option>
                            <option value="Nam">Chỉ Nam</option>
                            <option value="Nữ">Chỉ Nữ</option>
                            <option value="Hỗn hợp">Hỗn hợp</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight:600; display:block; margin-bottom:6px;">Sức chứa</label>
                        <select class="select" id="filter-capacity">
                            <option value="">Tất cả</option>
                            <option value="4">4 giường</option>
                            <option value="6">6 giường</option>
                            <option value="8">8 giường</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight:600; display:block; margin-bottom:6px;">Giá tối đa (VND)</label>
                        <select class="select" id="filter-price">
                            <option value="99999999">Mọi mức giá</option>
                            <option value="1800000">Dưới 1,800,000 đ</option>
                            <option value="2000000">Dưới 2,000,000 đ</option>
                            <option value="2500000">Dưới 2,500,000 đ</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight:600; display:block; margin-bottom:6px;">Trạng thái</label>
                        <select class="select" id="filter-status" ${mode === "select" ? "disabled" : ""}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="Trống" ${mode === "select" ? "selected" : ""}>Trống</option>
                            <option value="Chờ đặt cọc">Chờ đặt cọc</option>
                            <option value="Đã đặt cọc">Đã đặt cọc</option>
                            <option value="Đang thuê">Đang thuê</option>
                            <option value="Bảo trì">Bảo trì</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Lưới hiển thị kết quả -->
            <div>
                <div class="room-cards-grid" id="grid-rooms"></div>
                <div id="no-rooms-box" class="no-results-box" style="display: none;">
                    <p style="font-weight: 700; color: var(--gray-600); font-size: 16px;">❌ Không tìm thấy phòng/giường phù hợp</p>
                    <p style="font-size: 14px; color: var(--gray-500); margin-top: 6px;">Gợi ý: Thử thay đổi các bộ lọc ở cột bên trái</p>
                </div>
            </div>
        </div>

        <!-- Backdrop & Slide Panel chi tiết -->
        <div class="detail-panel-backdrop" id="panel-bg"></div>
        <div class="detail-panel" id="side-panel">
            <button class="panel-close-btn" id="panel-close-x">×</button>
            <div class="panel-title">
                <span>🛏</span> Chi tiết phòng <span id="panel-code-text" style="color: var(--primary)">P101</span>
            </div>
            <div style="overflow-y: auto; flex: 1; padding-right: 4px;" id="panel-scroll-content"></div>
        </div>
    `;

    // Elements
    const gridRooms = container.querySelector("#grid-rooms");
    const noRoomsBox = container.querySelector("#no-rooms-box");
    const sidePanel = container.querySelector("#side-panel");
    const panelBg = container.querySelector("#panel-bg");
    const panelCloseX = container.querySelector("#panel-close-x");
    const panelCodeText = container.querySelector("#panel-code-text");
    const panelScrollContent = container.querySelector("#panel-scroll-content");

    // Filter Elements
    const filterArea = container.querySelector("#filter-area");
    const filterType = container.querySelector("#filter-type");
    const filterCapacity = container.querySelector("#filter-capacity");
    const filterPrice = container.querySelector("#filter-price");
    const filterStatus = container.querySelector("#filter-status");

    // Render rooms
    function render() {
        const area = filterArea.value;
        const type = filterType.value;
        const capacity = filterCapacity.value;
        const priceMax = parseInt(filterPrice.value);
        const status = filterStatus.value;

        const filtered = SHARED_ROOMS_DATABASE.filter(room => {
            if (area && room.area !== area) return false;
            if (type && room.type !== type) return false;
            if (capacity && room.capacity !== parseInt(capacity)) return false;
            if (room.price > priceMax) return false;
            if (status && room.status !== status) return false;
            return true;
        });

        gridRooms.innerHTML = "";
        if (filtered.length === 0) {
            gridRooms.style.display = "none";
            noRoomsBox.style.display = "block";
            return;
        }

        gridRooms.style.display = "grid";
        noRoomsBox.style.display = "none";

        filtered.forEach(room => {
            const isSelected = room.id === selectedRoomId;
            const card = document.createElement("div");
            card.className = `room-card ${isSelected ? 'selected' : ''}`;
            
            let badgeClass = "status-empty";
            if (room.status === "Chờ đặt cọc") badgeClass = "status-pending";
            else if (room.status === "Đã đặt cọc") badgeClass = "status-deposit";
            else if (room.status === "Đang thuê") badgeClass = "status-renting";
            else if (room.status === "Bảo trì") badgeClass = "status-maintain";

            card.innerHTML = `
                <div class="room-card-header">
                    <span class="room-code">${room.id}</span>
                    <span class="badge ${badgeClass}">${room.status}</span>
                </div>
                <div class="room-info-row">📍 Khu vực: <strong>${room.area}</strong></div>
                <div class="room-info-row">🛏 Loại: <strong>Phòng ${room.type}</strong></div>
                <div class="room-info-row">👥 Sức chứa: <strong>${room.capacity} giường</strong></div>
                <div class="room-price">${room.price.toLocaleString('vi-VN')} đ/tháng</div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="btn btn-sm btn-primary" style="flex: 1;" data-action="detail">👁 Xem chi tiết</button>
                    ${mode === "select" ? `<button class="btn btn-sm btn-success" style="flex: 1;" data-action="select">${isSelected ? 'Đã chọn ✓' : 'Chọn phòng'}</button>` : ''}
                </div>
            `;

            // Click Handlers
            card.addEventListener("click", (e) => {
                const action = e.target.getAttribute("data-action");
                if (action === "detail") {
                    showDetails(room);
                } else if (action === "select") {
                    selectRoom(room);
                } else {
                    // Click on card default behavior
                    if (mode === "select") {
                        selectRoom(room);
                    } else {
                        showDetails(room);
                    }
                }
            });

            gridRooms.appendChild(card);
        });
    }

    function selectRoom(room) {
        if (room.status !== "Trống" && mode === "select") {
            alert(`Phòng ${room.id} đang ở trạng thái "${room.status}". Không thể chọn phòng này!`);
            return;
        }
        
        selectedRoomId = room.id;
        render();

        if (onSelect) {
            onSelect(room);
        }
    }

    function showDetails(room) {
        panelCodeText.innerText = room.id;
        
        let badgeClass = "status-empty";
        if (room.status === "Chờ đặt cọc") badgeClass = "status-pending";
        else if (room.status === "Đã đặt cọc") badgeClass = "status-deposit";
        else if (room.status === "Đang thuê") badgeClass = "status-renting";
        else if (room.status === "Bảo trì") badgeClass = "status-maintain";

        panelScrollContent.innerHTML = `
            <div style="background: var(--gray-100); height: 180px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-weight: 600; color: var(--gray-500); overflow: hidden; border: 1px solid var(--gray-200);">
                🖼 Ảnh phòng Homestay Dorm
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Khu vực</label>
                    <div class="detail-value">${room.area}</div>
                </div>
                <div class="detail-item">
                    <label>Loại phòng</label>
                    <div class="detail-value">Phòng ${room.type}</div>
                </div>
            </div>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Sức chứa</label>
                    <div class="detail-value">${room.capacity} giường</div>
                </div>
                <div class="detail-item">
                    <label>Đơn giá</label>
                    <div class="detail-value" style="color: var(--primary); font-weight: 700;">${room.price.toLocaleString('vi-VN')} VND</div>
                </div>
            </div>
            <div class="detail-item">
                <label>Trạng thái</label>
                <div>
                    <span class="badge ${badgeClass}">${room.status}</span>
                </div>
            </div>
            <div class="detail-item">
                <label>Tiện ích có sẵn</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${room.amenities.map(amenity => `<span class="badge" style="background: var(--gray-100); color: var(--gray-800); font-weight: 500; font-size:12px;">${amenity}</span>`).join('')}
                    <span class="badge" style="background: var(--gray-100); color: var(--gray-800); font-weight: 500; font-size:12px;">⚡ Điện nước giá rẻ</span>
                </div>
            </div>
            <div class="detail-item">
                <label>Lịch sử trạng thái phòng</label>
                <div class="timeline" style="margin-top: 12px;">
                    ${room.history.map(hist => `
                        <div class="timeline-item">
                            <div class="timeline-date">${hist.date}</div>
                            <div class="timeline-title">${hist.title}</div>
                            <p style="font-size: 13px; color: var(--gray-600)">${hist.desc}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        sidePanel.classList.add("open");
        panelBg.classList.add("open");
    }

    function closePanel() {
        sidePanel.classList.remove("open");
        panelBg.classList.remove("open");
    }

    // Bind events
    panelBg.addEventListener("click", closePanel);
    panelCloseX.addEventListener("click", closePanel);

    filterArea.addEventListener("change", render);
    filterType.addEventListener("change", render);
    filterCapacity.addEventListener("change", render);
    filterPrice.addEventListener("change", render);
    filterStatus.addEventListener("change", render);

    // Initial render
    render();
}
