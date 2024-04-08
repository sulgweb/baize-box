import React, { useMemo, useRef, useState } from "react";
import { Button, message, Upload, Table, Progress } from "antd";
import { nanoid } from "nanoid";
import AppSelectFile from "@renderer/components/AppSelectFile";
import TranscodeTypeModal from "./components/TranscodeTypeModal";
import { formatTime } from "@renderer/utils/formatTime";
import "./index.module.less";

const { Dragger } = Upload;

export default function Transcode() {
  const [filePath, setFilePath] = useState(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [transcodeList, setTranscodeList] = useState([]);
  const transcodeListRef = useRef(transcodeList);
  const selectFile = async (e) => {
    // const res = await window.electron.ipcRenderer.invoke("WIN_SELECT_FILE");
    if (e.file.path) {
      setFilePath(e.file.path);
      setShowTypeModal(true);
    }
  };

  const columns = useMemo(() => {
    return [
      {
        title: "文件",
        dataIndex: "inputFilePath",
        key: "inputFilePath",
        width: 200,
      },
      {
        title: "转换类型",
        dataIndex: "outputType",
        key: "outputType",
        width: 100,
      },
      {
        title: "进度",
        dataIndex: "progress",
        key: "progress",
        width: 100,
        render: (progress) => <Progress percent={progress} />,
      },
      {
        title: "创建时间",
        dataIndex: "createTime",
        key: "createTime",
        width: 100,
        render: (createTime: number) => formatTime(createTime),
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        width: 100,
        render: (_, record) => {
          return (
            <Button
              onClick={() => {
                // todo
                console.log(record);
              }}
              type="link"
            >
              打开文件夹
            </Button>
          );
        },
      },
    ];
  }, []);

  const changeTranscodeList = (list) => {
    console.log(list);
    transcodeListRef.current = list;
    setTranscodeList(list);
  };

  const handleFile = (outputType) => {
    setShowTypeModal(false);
    const outputFileName = `${new Date().getTime()}.${outputType}`;
    const taskId = nanoid(16);
    const params = {
      command: [
        "-i",
        filePath,
        "-c:v",
        "h264",
        "-c:a",
        "aac",
        "-strict",
        "experimental",
      ],
      taskId,
      inputFilePath: filePath,
      outputFileName,
      outputType,
      creatTime: new Date().getTime(),
      progress: 0,
    };
    changeTranscodeList([...(transcodeListRef.current || []), params]);
    window.electron.ipcRenderer.send("FFMPEG_COMMAND", params);
    window.electron.ipcRenderer.on(`FFMPEG_PROGRESS_${taskId}`, (e, data) => {
      console.log(transcodeListRef.current);
      changeTranscodeList([
        ...transcodeListRef.current?.map((item) => {
          if (item?.taskId === taskId) {
            item.progress = data.progress;
          }
          return item;
        }),
      ]);
      console.log(data);
    });
  };
  return (
    <div styleName="transcode">
      <AppSelectFile onSelectFile={selectFile} />
      <TranscodeTypeModal
        open={showTypeModal}
        onCancel={() => setShowTypeModal(false)}
        onOk={handleFile}
      />
      <Table
        styleName="transcode-table"
        columns={columns}
        dataSource={transcodeList}
        rowKey={"taskId"}
      />
    </div>
  );
}