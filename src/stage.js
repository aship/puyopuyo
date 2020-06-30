class Stage {
  // static stageElement;
  // static scoreElement;
  // static zenkeshiImage;
  // static board;
  // static puyoCount;
  // static fallingPuyoList = [];
  // static eraseStartFrame;
  // static erasingPuyoInfoList = [];

  static initialize() {
    // HTML からステージの元となる要素を取得し、大きさを設定する
    const stageElement = document.getElementById("stage");
    stageElement.style.width = Config.puyoImgWidth * Config.stageCols + "px";
    stageElement.style.height = Config.puyoImgHeight * Config.stageRows + "px";
    stageElement.style.backgroundColor = Config.stageBackgroundColor;
    this.stageElement = stageElement;

    const zenkeshiImage = document.getElementById("zenkeshi");
    zenkeshiImage.width = Config.puyoImgWidth * 6;
    zenkeshiImage.style.position = "absolute";
    zenkeshiImage.style.display = "none";
    this.zenkeshiImage = zenkeshiImage;
    stageElement.appendChild(zenkeshiImage);

    const scoreElement = document.getElementById("score");
    scoreElement.style.backgroundColor = Config.scoreBackgroundColor;
    scoreElement.style.top = Config.puyoImgHeight * Config.stageRows + "px";
    scoreElement.style.width = Config.puyoImgWidth * Config.stageCols + "px";
    scoreElement.style.height = Config.fontHeight + "px";
    this.scoreElement = scoreElement;

    // メモリを準備する
    this.board = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];
    let puyoCount = 0;
    for (let y = 0; y < Config.stageRows; y++) {
      const line = this.board[y] || (this.board[y] = []);
      for (let x = 0; x < Config.stageCols; x++) {
        const puyo = line[x];
        if (puyo >= 1 && puyo <= 5) {
          // line[x] = {puyo: puyo, element: this.setPuyo(x, y, puyo)};
          this.setPuyo(x, y, puyo);
          puyoCount++;
        } else {
          line[x] = null;
        }
      }
    }
    this.puyoCount = puyoCount;
  }

  // 画面とメモリ両方に puyo をセットする
  static setPuyo(x, y, puyo) {
    // 画像を作成し配置する
    const puyoImage = PuyoImage.getPuyo(puyo);
    puyoImage.style.left = x * Config.puyoImgWidth + "px";
    puyoImage.style.top = y * Config.puyoImgHeight + "px";
    this.stageElement.appendChild(puyoImage);
    // メモリにセットする
    this.board[y][x] = {
      puyo: puyo,
      element: puyoImage,
    };
  }

  // 自由落下をチェックする
  static checkFall() {
    this.fallingPuyoList.length = 0;
    let isFalling = false;
    // 下の行から上の行を見ていく
    for (let y = Config.stageRows - 2; y >= 0; y--) {
      const line = this.board[y];
      for (let x = 0; x < line.length; x++) {
        if (!this.board[y][x]) {
          // このマスにぷよがなければ次
          continue;
        }
        if (!this.board[y + 1][x]) {
          // このぷよは落ちるので、取り除く
          let cell = this.board[y][x];
          this.board[y][x] = null;
          let dst = y;
          while (dst + 1 < Config.stageRows && this.board[dst + 1][x] == null) {
            dst++;
          }
          // 最終目的地に置く
          this.board[dst][x] = cell;
          // 落ちるリストに入れる
          this.fallingPuyoList.push({
            element: cell.element,
            position: y * Config.puyoImgHeight,
            destination: dst * Config.puyoImgHeight,
            falling: true,
          });
          // 落ちるものがあったことを記録しておく
          isFalling = true;
        }
      }
    }
    return isFalling;
  }
  // 自由落下させる
  static fall() {
    let isFalling = false;
    for (const fallingPuyo of this.fallingPuyoList) {
      if (!fallingPuyo.falling) {
        // すでに自由落下が終わっている
        continue;
      }
      let position = fallingPuyo.position;
      position += Config.freeFallingSpeed;
      if (position >= fallingPuyo.destination) {
        // 自由落下終了
        position = fallingPuyo.destination;
        fallingPuyo.falling = false;
      } else {
        // まだ落下しているぷよがあることを記録する
        isFalling = true;
      }
      // 新しい位置を保存する
      fallingPuyo.position = position;
      // ぷよを動かす
      fallingPuyo.element.style.top = position + "px";
    }
    return isFalling;
  }

  // 消せるかどうか判定する
  static checkErase(startFrame) {
    this.eraseStartFrame = startFrame;
    this.erasingPuyoInfoList.length = 0;

    // 何色のぷよを消したかを記録する
    const erasedPuyoColor = {};

    // 隣接ぷよを確認する関数内関数を作成
    const sequencePuyoInfoList = [];
    const existingPuyoInfoList = [];
    const checkSequentialPuyo = (x, y) => {
      // ぷよがあるか確認する
      const orig = this.board[y][x];
      if (!orig) {
        // ないなら何もしない
        return;
      }
      // あるなら一旦退避して、メモリ上から消す
      const puyo = this.board[y][x].puyo;
      sequencePuyoInfoList.push({
        x: x,
        y: y,
        cell: this.board[y][x],
      });
      this.board[y][x] = null;

      // 四方向の周囲ぷよを確認する
      const direction = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (let i = 0; i < direction.length; i++) {
        const dx = x + direction[i][0];
        const dy = y + direction[i][1];

        // ステージの外にはみ出た

        // ぷよの色が違う

        // そのぷよのまわりのぷよも消せるか確認する
      }
    };

    // 実際に削除できるかの確認を行う
    for (let y = 0; y < Config.stageRows; y++) {
      for (let x = 0; x < Config.stageCols; x++) {
        sequencePuyoInfoList.length = 0;
        const puyoColor = this.board[y][x] && this.board[y][x].puyo;
        checkSequentialPuyo(x, y);
        if (
          sequencePuyoInfoList.length == 0 ||
          sequencePuyoInfoList.length < Config.erasePuyoCount
        ) {
          // 連続して並んでいる数が足りなかったので消さない
          if (sequencePuyoInfoList.length) {
            // 退避していたぷよを消さないリストに追加する
            existingPuyoInfoList.push(...sequencePuyoInfoList);
          }
        } else {
          // これらは消して良いので消すリストに追加する
          this.erasingPuyoInfoList.push(...sequencePuyoInfoList);
          erasedPuyoColor[puyoColor] = true;
        }
      }
    }
    this.puyoCount -= this.erasingPuyoInfoList.length;

    // 消さないリストに入っていたぷよをメモリに復帰させる
    for (const info of existingPuyoInfoList) {
      this.board[info.y][info.x] = info.cell;
    }

    if (this.erasingPuyoInfoList.length) {
      // もし消せるならば、消えるぷよの個数と色の情報をまとめて返す
      return {
        piece: this.erasingPuyoInfoList.length,
        color: Object.keys(erasedPuyoColor).length,
      };
    }
    return null;
  }
  // 消すアニメーションをする
  static erasing(frame) {
    const elapsedFrame = frame - this.eraseStartFrame;
    const ratio = elapsedFrame / Config.eraseAnimationDuration;
    if (ratio > 1) {
      // アニメーションを終了する
      for (const info of this.erasingPuyoInfoList) {
        var element = info.cell.element;
        this.stageElement.removeChild(element);
      }
      return false;
    } else if (ratio > 0.75) {
      for (const info of this.erasingPuyoInfoList) {
        var element = info.cell.element;
        element.style.display = "block";
      }
      return true;
    } else if (ratio > 0.5) {
      for (const info of this.erasingPuyoInfoList) {
        var element = info.cell.element;
        element.style.display = "none";
      }
      return true;
    } else if (ratio > 0.25) {
      for (const info of this.erasingPuyoInfoList) {
        var element = info.cell.element;
        element.style.display = "block";
      }
      return true;
    } else {
      for (const info of this.erasingPuyoInfoList) {
        var element = info.cell.element;
        element.style.display = "none";
      }
      return true;
    }
  }

  static showZenkeshi() {
    // 全消しを表示する
    this.zenkeshiImage.style.display = "block";
    this.zenkeshiImage.style.opacity = "1";
    const startTime = Date.now();
    const startTop = Config.puyoImgHeight * Config.stageRows;
    const endTop = (Config.puyoImgHeight * Config.stageRows) / 3;
    const animation = () => {
      const ratio = Math.min(
        (Date.now() - startTime) / Config.zenkeshiDuration,
        1
      );
      this.zenkeshiImage.style.top =
        (endTop - startTop) * ratio + startTop + "px";
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      }
    };
    animation();
  }
  static hideZenkeshi() {
    // 全消しを消去する
    const startTime = Date.now();
    const animation = () => {
      const ratio = Math.min(
        (Date.now() - startTime) / Config.zenkeshiDuration,
        1
      );
      this.zenkeshiImage.style.opacity = String(1 - ratio);
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      } else {
        this.zenkeshiImage.style.display = "none";
      }
    };
    animation();
  }
}
Stage.fallingPuyoList = [];
Stage.erasingPuyoInfoList = [];
