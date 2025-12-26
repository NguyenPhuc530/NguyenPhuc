# LAN Speed Test (Web)

Project demo đo tốc độ mạng LAN (ping / download / upload) với UI cải tiến và đồ thị thời gian thực.

License
-------
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Requirements
- Node.js 16+
- Máy chạy server và client phải ở cùng mạng LAN; server lắng nghe port mặc định 3000.

Quickstart
1. Clone repo:
   git clone https://github.com/NguyenPhuc530/NguyenPhuc.git
   cd NguyenPhuc
2. Install dependencies:
   npm install
3. Start server:
   npm start
4. From a browser on a client machine in the same LAN open:
   http://<IP-of-server>:3000
   (If testing from the server machine, you can open http://localhost:3000)

Usage
- Enter the server IP:port in the "Server" field when accessing the UI from another machine (eg. `192.168.1.10:3000`). Leave empty to use the same host.
- Configure test duration, number of parallel connections and chunk size.
- Click "Bắt đầu" to start the test. Results are shown in Mbps on the live chart.

Contributing
- Feel free to open issues or pull requests.
- Suggested improvements: add auto-discovery (mDNS/UDP), WebRTC mode, CSV export, persistent history, or CI checks.

Security & Notes
- This is a demo: the server does not persist uploads; it only counts bytes for the test.
- Avoid excessively large chunk sizes or many parallel connections on low-power machines.

Contact
- Repository: https://github.com/NguyenPhuc530/NguyenPhuc
