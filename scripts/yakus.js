//this is a lookup table for yakus in the way riichi city stores them, use them as you will
const yakus = {
    English: [
        "Riichi", "Tsumo", "Ippatsu", "After a Kan", "Under the Sea", "Under the River", "Robbing a Kan", "Red Dragon", "Green Dragon", "White Dragon", "Prevalent Wind", 
        "Seat Wind", "Pure Double Sequence", "Pinfu", "All Simples", "Double Riichi", "All Triplets", "Seven Pairs", "Three Concealed Triplets", "Three Quads", "All Terminals and Honors", 
        "Half Outside Hand", "Pure Straight", "Mixed Triple Sequence", "Little Three Dragons", "Triple Triplets", "Fully Outside Hand", "Half Flush", "Twice Pure Double Sequence", "Full Flush", "Mangan at Draw", 
        "Blessing of Heaven", "Blessing of Earth", "Blessing of Man", "Thirteen Orphans", "Thirteen-Wait Thirteen Orphans", "Nine Gates", "True Nine Gates", "Four Concealed Triplets", "Four Concealed Triplets Single-Wait", "Four Quads",
        "All Terminals", "All Honors", "Big Four Winds", "Small Four Winds", "Big Three Dragons", "All Green", "Pure all green", "Eight consecutive dealerships", "Red Dora", "Dora", 
        "Reverse Dora", "Open Riichi", "Open Double Riichi", "Open Riichi Deal-in", "Nuki Dora"
    ],
    English_weeb: [
        "Riichi", "Tsumo", "Ippatsu", "Rinshan Kaihou", "Haitei Raoyue", "Houtei Raoyui", "Chankan", "Chun", "Hatsu", "Haku", "Round Wind", 
        "Seat Wind", "Iipeikou", "Pinfu", "Tanyao", "Double Riichi", "Toitoi", "Chiitoitsu", "Sanankou", "Sankantsu", "Honroutou", 
        "Chantaiyao", "Ittsu", "Sanshoku Doujun", "Shousangen", "Sanshoku Doukou", "Junchan Taiyao", "Honitsu", "Ryanpeikou", "Chinitsu", "Nagashi Mangan", 
        "Tenhou", "Chiihou", "Renhou", "Kokushi Musou", "Kokushi Juusanmen", "Chuuren Poutou", "Chuuren Kyuumen", "Suuankou", "Suuankou Tanki", "Suukantsu",
        "Chinroutou", "Tsuuiisou", "Daisuushii", "Shousuushii", "Daisangen", "Ryuuiisou", "Chinryuusou", "Paarenchan", "Aka Dora", "Dora", 
        "Ura Dora", "Open Riichi", "Open Double Riichi", "Open Riichi Deal-in", "Nuki Dora"
    ],
    Japanese: [
        "立直", "門前清自摸和", "一発", "嶺上開花", "海底撈月", "河底撈魚", "搶槓", "役牌", "役牌", "役牌", "役牌", 
        "役牌", "一盃口", "平和", "断幺九", "両立直", "対々", "七対子", "三暗刻", "三槓子", "混老頭", 
        "全帯幺九", "一気通貫", "三色同順", "小三元", "三色同刻", "純全帯么", "混一色", "二盃口", "清一色", "流し満貫", 
        "天和", "地和", "人和", "国士無双", "国士無双１３面待ち", "九連宝燈", "純正九蓮宝燈", "四暗刻", "四暗刻単騎", "四槓子",
        "清老頭", "字一色", "大四喜", "小四喜", "大三元", "緑一色", "純正緑一色", "八連荘", "赤ドラ", "ドラ", 
        "裏ドラ", "開立直", "開両立直", "開立直", "キタ"
    ],
    //chinese: []  Make Anton do later
    yakuman : [ 
        0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,2,1,2,1,2,1, //using renhou as yakuman here, feel free to change this to reflect EMA rules, renhou is the third value in this row
        1,1,2,1,1,1,2,1,0,0,
        0,0,0,1,0
    ],
    doras: [49,50,51,55],
}
module.exports = yakus;