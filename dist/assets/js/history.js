// history.js — 图文工坊新建功能（历史记录已移除）
(function () {
  'use strict';

  function isBodyMode() {
    return document.body.classList.contains('mode-body');
  }

  function currentHasContent() {
    if (isBodyMode()) {
      const be = window.getBodyEditor ? window.getBodyEditor() : null;
      return be ? be.hasContent() : false;
    }
    try {
      const state = coverStateForStorage();
      return state && state.templates && Object.keys(state.templates).length > 0;
    } catch (_) {
      return false;
    }
  }

  function newCover() {
    // 重置所有模板为默认数据
    Object.entries(TEMPLATES).forEach(([key, template]) => {
      if (COVER_DEFAULT_DATA[key]) {
        template.data = JSON.parse(JSON.stringify(COVER_DEFAULT_DATA[key]));
      }
      template.typographyOverrides = {};
    });

    // 清除批注
    Object.keys(ANNOTATIONS).forEach((key) => delete ANNOTATIONS[key]);
    saveAnnotations();

    // 重置当前模板
    currentKey = 'notebook';
    selectedAnnotationId = null;

    // 保存并重新渲染
    saveCoverState();

    // 更新模板缩略图激活态
    document.querySelectorAll('.tpl-thumb').forEach((x) => x.classList.remove('active'));
    const notebookThumb = document.querySelector('.tpl-thumb[data-key="notebook"]');
    if (notebookThumb) notebookThumb.classList.add('active');

    renderCanvas();
    buildInspector();
  }

  function newBody() {
    const be = window.getBodyEditor ? window.getBodyEditor() : null;
    if (!be) {
      // body 编辑器还没初始化，先写入默认状态到 localStorage
      try {
        localStorage.setItem('tuwenBodyEditorState.v1', '{}');
      } catch (_) {}
      // 切换到 body 模式会自动初始化
      if (window.setMode) window.setMode('body');
      return;
    }
    be.reset();
  }

  function newProject() {
    if (isBodyMode()) {
      newBody();
    } else {
      newCover();
    }
  }

  function bindEvents() {
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        if (currentHasContent()) {
          if (confirm('当前有内容，确定要新建吗？未保存的内容将丢失。')) {
            newProject();
          }
        } else {
          newProject();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  window.tuwenNew = { newProject };
})();
