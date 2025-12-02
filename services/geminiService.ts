
import { GoogleGenAI, Type } from "@google/genai";
import { EstimationResult } from "../types";

// Helper function to safely retrieve API Key from environment
const getEnvApiKey = () => {
  try {
    // 1. Check for VITE_ prefix (Standard for Vite apps)
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_API_KEY;
      }
    } catch (e) {
      // Ignore errors if import.meta is not available
    }

    // 2. Check for VITE_API_KEY in process.env (Alternative Vercel build)
    if (typeof process !== 'undefined' && process.env && process.env.VITE_API_KEY) {
      return process.env.VITE_API_KEY;
    }

    // 3. Check for REACT_APP_ prefix
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_KEY) {
      return process.env.REACT_APP_API_KEY;
    }

    // 4. Check for standard API_KEY
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }

    // 5. Legacy window fallback
    if (typeof window !== 'undefined' && (window as any).API_KEY) {
      return (window as any).API_KEY;
    }
  } catch (e) {
    console.warn("Error reading env vars:", e);
  }
  return "";
};

export interface AnalysisConfig {
  material: string;
  od: string;
  id: string;
  length: string;
  sides: '1-left' | '1-right' | '1-complete' | '2';
  strategy: 'conservative' | 'standard' | 'aggressive';
  spindleMode: 'G96' | 'G97';
  userRemarks?: string;
  apiKey?: string; // Add optional API Key to config
}

export const analyzeBlueprint = async (
  base64Image: string, 
  mimeType: string, 
  config: AnalysisConfig
): Promise<EstimationResult> => {
  
  const { material, od, id, length, sides, strategy, spindleMode, userRemarks, apiKey } = config;

  // 1. Determine which API Key to use (UI Input > Env Var)
  const effectiveApiKey = apiKey?.trim() || getEnvApiKey();

  if (!effectiveApiKey) {
    throw new Error("API_KEY_MISSING: 請在 Vercel 設定環境變數，或在網頁下方直接輸入 API Key。");
  }

  // 2. Initialize Client PER REQUEST to ensure we use the latest key
  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const materialInstruction = material 
    ? `使用者已明確指定加工材質為: "${material}"。請務必基於此材質特性設定切削參數 (S/F)。`
    : `識別可能的材質 (若圖面未指定，預設為 "S45C 中碳鋼")。`;

  const dimInstruction = `
    使用者設定的毛胚尺寸:
    - 外徑 (OD): ${od} mm
    - 內徑 (ID): ${id ? id : '0'} mm ${id && Number(id) > 0 ? '(這是一支管材/空心料，內徑加工請勿使用鑽頭鑽實心，請直接使用鏜孔刀)' : '(實心棒材)'}
    - 長度 (L): ${length} mm
  `;

  let sideInstruction = "";
  switch (sides) {
    case '1-left':
      sideInstruction = `
        **加工方向: 單面加工 - 左側 (Left Side Only)**
        - 假設夾頭夾持工件的右側 (Right)，刀具加工工件的左側 (Left)。
        - 請只分析圖面左半部的特徵進行估算。
        - 不需要「掉頭 (Flip)」工序。
      `;
      break;
    case '1-right':
      sideInstruction = `
        **加工方向: 單面加工 - 右側 (Right Side Only)**
        - 這是標準臥式車床的加工方向。
        - 假設夾頭夾持工件的左側 (Left)，刀具加工工件的右側 (Right)。
        - 請只分析圖面右半部的特徵進行估算。
        - 不需要「掉頭 (Flip)」工序。
      `;
      break;
    case '1-complete':
      sideInstruction = `
        **加工方向: 一次加工完成 (Complete in One Setup)**
        - 假設目標是在一次裝夾中完成所有可能的加工 (或使用切斷刀直接切下成品)。
        - **嚴禁** 產生「掉頭 (Flip Part)」工序。
        - 若圖面有背面特徵，請假設使用切斷刀加工背面，或忽略無法接觸的區域。
      `;
      break;
    case '2':
    default:
      sideInstruction = `
        **加工方向: 雙面加工 (2 Sides / OP10 + OP20)**
        - 必須包含兩個階段。
        - 第一序 (OP10) 加工一端。
        - **必須** 包含一個「人工掉頭 (Flip Part)」或「副主軸接料」的動作工序。
        - 第二序 (OP20) 加工另一端。
      `;
      break;
  }

  let strategyInstruction = "";
  switch (strategy) {
    case 'conservative':
      strategyInstruction = `
        **加工策略: 保守 (Conservative)**
        - 請使用較低、安全的切削速度 (RPM) 與進給率 (Feed)。
        - 優先考慮加工穩定性、夾持力不足的可能性以及表面光潔度。
        - **特別注意**: 對於鋁合金 (AL6061) 或軟料，即使材質允許高速，在此模式下請將轉速限制在 2500 RPM 以下，進給率保持保守，避免震動或纏屑。
        - 估算時間會較長。
      `;
      break;
    case 'aggressive':
      strategyInstruction = `
        **加工策略: 高效率 (Aggressive/Production)**
        - 假設機台剛性良好且使用現代化刀具。
        - 請使用該材質允許的最高合理切削速度與進給率，以縮短 Cycle Time。
        - 減少精修預留量與走刀次數。
      `;
      break;
    default: // standard
      strategyInstruction = `
        **加工策略: 標準 (Standard)**
        - 使用刀具原廠建議的標準切削參數。
        - 平衡加工時間與刀具壽命。
      `;
      break;
  }

  let spindleInstruction = "";
  if (spindleMode === 'G96') {
    spindleInstruction = `
      **主軸轉速模式: G96 (周速一定控制 Constant Surface Speed)**
      - 這是 CNC 車床最常用的模式。
      - 請假設切削速度 Vc (m/min) 保持恆定。
      - 當刀具往中心移動 (直徑變小) 時，RPM 會自動升高。
      - **計算時間時**: 請務必考慮隨著直徑變小 RPM 變快，導致加工時間縮短的效應。
      - (中心鑽孔、攻牙等中心加工除外，仍依 G97 邏輯)。
    `;
  } else {
    spindleInstruction = `
      **主軸轉速模式: G97 (固定轉速控制 Constant RPM)**
      - 請假設主軸在加工過程中維持固定轉速 (Fixed RPM)。
      - 請依據工件最大直徑或最保守條件設定一個固定的 RPM。
      - 由於直徑變小時切削速度 (Vc) 會降低，**加工時間通常會比 G96 長**，請反映此差異。
      - 適用於鑽孔、攻牙、車牙或使用者指定特殊需求。

      **鋁合金 (Aluminum) G97 轉速強制規定:**
      若材質判斷為鋁合金 (Aluminum/AL6061/7075等)，請直接使用以下固定轉速，勿自行計算：
      - 保守 (Conservative): 1500 RPM
      - 標準 (Standard): 1800 RPM
      - 高效率 (Aggressive): 2000 RPM
    `;
  }

  // User Remarks Injection
  const remarksInstruction = userRemarks 
    ? `
      **⚠️ 使用者重要備註 (User Remarks)**:
      使用者給予了以下特別指示，請在分析與安排工序時**優先**遵守：
      "${userRemarks}"
    `
    : "";

  const systemInstruction = `
    你是一位擁有 20 年經驗的 CNC 數控車床程式設計師與製造工程師。
    你的任務是分析機械工程圖 (Blueprints/Technical Drawings)。
    
    請使用 **繁體中文 (Traditional Chinese)** 並使用台灣機械加工常用術語回答。
    
    **強制遵循以下使用者設定:**
    1. ${materialInstruction}
    2. ${dimInstruction}
    3. ${sideInstruction}
    4. ${strategyInstruction}
    5. ${spindleInstruction}
    6. ${remarksInstruction}
    
    **分析步驟:**
    1. 根據使用者提供的毛胚尺寸作為起始狀態。
    2. 將加工過程分解為合理的車床工序 (例如：車端面、外徑粗車、外徑精車、鑽孔、內徑鏜孔、切槽、車牙、切斷、掉頭、背面加工 等)。
    3. 針對每個工序，依據上述「加工策略」與「主軸模式(G96/G97)」預估切削參數 (轉速 RPM, 進給 Feed) 並計算加工秒數 (Cycle Time)。
    4. 加總總時間。
    5. 評估加工難易度。
    
    請務必考量裝夾與換刀時間。請回傳純 JSON 格式資料。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "分析這張工程圖，並預估使用二軸 CNC 車床加工的時間與工序。",
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partName: { type: Type.STRING, description: "零件名稱或是 '未命名零件'" },
            material: { type: Type.STRING, description: "最終使用的材質" },
            stockDiameter: { type: Type.STRING, description: "預估毛胚直徑 (包含單位，如 mm)" },
            stockInnerDiameter: { type: Type.STRING, description: "預估毛胚內徑 (包含單位，如 mm)，若是實心請填 0" },
            stockLength: { type: Type.STRING, description: "預估毛胚長度 (包含單位，如 mm)" },
            difficultyRating: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "雖然輸出英文 Enum，但在 UI 會顯示中文" },
            notes: { type: Type.STRING, description: "簡短的工程註記或加工注意事項 (繁體中文)" },
            totalTimeSeconds: { type: Type.NUMBER, description: "總加工週期秒數" },
            operations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "工序名稱 (如：外徑粗車)" },
                  description: { type: Type.STRING, description: "工序詳細說明" },
                  toolType: { type: Type.STRING, description: "刀具類型 (如：CNMG 432 外徑刀)" },
                  estimatedTimeSeconds: { type: Type.NUMBER, description: "該工序預估秒數" },
                  rpm: { type: Type.NUMBER, description: "建議轉速 (若是 G96 則為最高限制轉速或平均轉速)" },
                  feedRate: { type: Type.NUMBER, description: "建議進給 (mm/rev)" },
                },
                required: ["name", "description", "estimatedTimeSeconds", "toolType"],
              },
            },
          },
          required: ["partName", "material", "operations", "totalTimeSeconds", "difficultyRating"],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as EstimationResult;
      // Inject input config into result for UI referencing
      parsed.sideMode = sides;
      return parsed;
    } else {
      throw new Error("Gemini 沒有回傳資料");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
