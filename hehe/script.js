console.log("Hello from Tiendev AI! (MD flow)");

// helper: delay (debug)
const sleep = ms => new Promise(r => setTimeout(r, ms));

// animation
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".fade-in").forEach((el, i) => {
    setTimeout(() => el.classList.add("show"), i * 100);
  });
});

// === CẤU HÌNH (thay đổi cho repo của bạn) ===
const GITHUB_OWNER = 'hoanggiabao9988';
const GITHUB_REPO = 'hocdev';
// Worker upload URL (đổi thành URL bạn deploy)
const WORKER_UPLOAD_URL = 'https://your-worker-subdomain.workers.dev/upload';

// === FORM GỬI BÀI (trong index.html hay trang có form) ===
const form = document.getElementById('article-upload-form');
const statusBox = document.getElementById('upload-status');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('article-title').value.trim();
    const content = document.getElementById('article-content').value.trim();
    if (!title || !content) {
      statusBox.innerText = 'Vui lòng nhập tiêu đề và nội dung';
      statusBox.style.color = 'orange';
      return;
    }

    statusBox.innerText = '⏳ Đang gửi bài...';
    statusBox.style.color = '#4db8ff';

    // tạo slug đơn giản từ title
    const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 120);

    try {
      const res = await fetch(WORKER_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          slug,
          repoOwner: GITHUB_OWNER,
          repoName: GITHUB_REPO
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        statusBox.innerText = '✅ Gửi bài thành công! Redirect...';
        statusBox.style.color = 'lime';
        form.reset();
        // chờ 1 giây rồi chuyển sang trang list
        await sleep(900);
        window.location.href = `lessons.html?added=${encodeURIComponent(slug)}`;
      } else {
        console.error('Upload failed', data);
        statusBox.innerText = '❌ Gửi thất bại. Kiểm tra console.';
        statusBox.style.color = 'red';
      }
    } catch (err) {
      console.error(err);
      statusBox.innerText = '❌ Lỗi kết nối.';
      statusBox.style.color = 'red';
    }
  });
}

// === LOAD POSTS: từ GitHub (folder /posts) ===
// Lấy danh sách file trong folder posts
async function loadPostList() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/posts`;
  const res = await fetch(apiUrl);
  if (!res.ok) return [];
  const files = await res.json(); // array of file info
  // filter .md only and sort by name/date heuristic
  const mdFiles = files.filter(f => f.name.endsWith('.md'));
  // load file contents (download_url)
  const posts = [];
  for (const f of mdFiles) {
    try {
      const textRes = await fetch(f.download_url);
      const raw = await textRes.text();
      // first line may be "# Title"
      const firstLine = raw.split('\n')[0].replace(/^#\s*/, '').trim();
      posts.push({
        name: f.name,
        slug: f.name.replace(/\.md$/i, ''),
        title: firstLine || f.name.replace(/\.md$/i, ''),
        content: raw,
        url: f.download_url
      });
    } catch (e) {
      console.warn('Failed to load', f.name, e);
    }
  }
  // optional: newest first by name/date
  return posts.reverse();
}

// RENDER list into element with id=lesson-list (if exists)
async function renderPostList() {
  const listEl = document.getElementById('lesson-list');
  if (!listEl) return;
  listEl.innerHTML = '⏳ Đang tải danh sách...';
  const posts = await loadPostList();
  if (!posts.length) {
    listEl.innerHTML = '<p>Chưa có bài nào.</p>';
    return;
  }
  listEl.innerHTML = '';
  posts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.innerHTML = `
      <h4><a class="post-link" href="post.html?post=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h4>
      <p>${escapeHtml(snippetFromMarkdown(p.content, 140))}</p>
    `;
    listEl.appendChild(card);
  });
}

// helper: lấy đoạn preview từ markdown
function snippetFromMarkdown(md, len = 140) {
  // remove markdown headers and code blocks roughly
  let txt = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`]/g, '');
  txt = txt.replace(/\n+/g, ' ').trim();
  if (txt.length > len) txt = txt.slice(0, len) + '...';
  return txt;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// === SEARCH trên page list hoặc index (nếu có lesson-card) ===
function setupSearch(inputId = 'lesson-search') {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('keyup', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.lesson-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// === VIEW single post (post.html) ===
async function renderSinglePost() {
  const elTitle = document.getElementById('post-title');
  const elContent = document.getElementById('post-content');
  if (!elTitle || !elContent) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get('post');
  if (!slug) {
    elTitle.innerText = 'Không có bài được chọn';
    return;
  }
  elTitle.innerText = '⏳ Đang tải...';

  try {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/posts/${slug}.md`;
    const res = await fetch(rawUrl);
    if (!res.ok) {
      elTitle.innerText = 'Không tìm thấy bài';
      elContent.innerHTML = '';
      return;
    }
    const md = await res.text();
    // sử dụng marked.js để convert
    if (window.marked) {
      elContent.innerHTML = marked.parse(md);
    } else {
      // fallback: đơn giản thay newline -> <p>
      elContent.innerHTML = '<pre>' + escapeHtml(md) + '</pre>';
    }
    // lấy title từ header
    const firstLine = md.split('\n')[0].replace(/^#\s*/, '').trim();
    elTitle.innerText = firstLine || slug;
  } catch (e) {
    console.error(e);
    elTitle.innerText = 'Lỗi tải bài';
  }
}

// chạy init trên các trang
document.addEventListener('DOMContentLoaded', () => {
  renderPostList();
  setupSearch('lesson-search');
  setupSearch('search-input'); // nếu bạn vẫn để ô search trên index
  renderSinglePost();
});
