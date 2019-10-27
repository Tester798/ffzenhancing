{::nomarkdown}
<style>
    .carousel-wrapper {
        height: 400px;
        position: relative;
        width: 640px;
        margin: 0 auto;
    }

    .carousel-item {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 25px 50px;
        opacity: 0;
        transition: all 0.5s ease-in-out;
    }

    .arrow {
        border: solid black;
        border-width: 0 3px 3px 0;
        display: inline-block;
        padding: 12px;
    }

    .arrow-prev {
        left: -30px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%) rotate(135deg);
    }

    .arrow-next {
        right: -30px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%) rotate(-45deg);
    }

    .light {
        color: white;
    }

    @media (max-width: 480px) {
        .arrow,
        .light .arrow {
            background-size: 10px;
            background-position: 10px 50%;
        }
    }

    /*Select every element*/
    [id^="item"] {
        display: none;
    }

    .item-1 {
        z-index: 2;
        opacity: 1;
        background: url('images/image1.png');
        background-size: cover;
    }

    .item-2 {
        background: url('images/image2.png');
        background-size: cover;
    }

    .item-3 {
        background: url('images/image3.png');
        background-size: cover;
    }

    .item-4 {
        background: url('images/image4.png');
        background-size: cover;
    }

    *:target~.item-1 {
        opacity: 0;
    }

    #item-1:target~.item-1 {
        opacity: 1;
    }

    #item-2:target~.item-2,
    #item-3:target~.item-3,
    #item-4:target~.item-4 {
        z-index: 3;
        opacity: 1;
    }
</style>
<div class="carousel-wrapper">
    <span id="item-1"></span>
    <span id="item-2"></span>
    <span id="item-3"></span>
    <span id="item-4"></span>
    <div class="carousel-item item-1">
        <a class="arrow arrow-prev" href="#item-4"></a>
        <a class="arrow arrow-next" href="#item-2"></a>
    </div>
    <div class="carousel-item item-2">
        <a class="arrow arrow-prev" href="#item-1"></a>
        <a class="arrow arrow-next" href="#item-3"></a>
    </div>
    <div class="carousel-item item-3">
        <a class="arrow arrow-prev" href="#item-2"></a>
        <a class="arrow arrow-next" href="#item-4"></a>
    </div>
    <div class="carousel-item item-4">
        <a class="arrow arrow-prev" href="#item-3"></a>
        <a class="arrow arrow-next" href="#item-1"></a>
    </div>
</div>
{:/}

[Report issue](https://github.com/Tester798/ffzenhancing/issues)